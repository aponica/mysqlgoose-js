//=============================================================================
//  Copyright 2019-2021 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

//-----------
//  @ignore
//-----------

const kfSprintf = require( 'sprintf-js').sprintf;
const kcMysqlgoose = require( './Mysqlgoose' );

const kcMysqlgooseError = require( './MysqlgooseError.js' );

const hiModels = {};


//-----------------------------------------------------------------------------
//  @function fhAddOrderByToStmt
//  @private
//
//  @summary
//    Adds the `ORDER BY` clauses to a query.
//
//  @param {Model|Object} vContext
//    Either the context `Model` for the `hOrders`, or a specific column
//    definition.
//
//  @param {Object} hOrders
//    A set of order-by directives. This might contain nested directives,
//    in which case this function is called recursively with the contents
//    and their new `vContext`.
//
//  @param {Object} hStmt
//    The statement so far.
//
//  @returns {Object}
//    The revised statement (hStmt).
//
//  @throws {MysqlgooseError}
//-----------------------------------------------------------------------------

function fhAddOrderByToStmt( vContext, hOrders, hStmt ) {

  for ( let zKey in hOrders )
    if ( hOrders.hasOwnProperty( zKey ) ) { // zKey

      const vValue = hOrders[ zKey ];

      if ( ( vContext instanceof Model ) &&
        vContext.iSchema.hhColDefs.hasOwnProperty( zKey ) )
          { // new context is a column definition

          if ( hStmt.hasOwnProperty( 'orderby' ) )
            hStmt.orderby += ', ';
          else
            hStmt.orderby = '';

          hStmt.orderby += vContext.zSafeTableName + '.' +
            vContext.iSchema.hhColDefs[ zKey ].zSafeColumnName;

          if ( ! Number.isInteger( vValue ) )
            throw new kcMysqlgooseError(
              '$orderby expected integer direction, found ' +
                JSON.stringify( vValue ) );

          if ( 0 > vValue )
            hStmt.orderby += ' DESC';

          } // new context is a column definition

      else if ( hiModels.hasOwnProperty( zKey ) )
        { // new context is a model

        hStmt = fhAddOrderByToStmt( hiModels[ zKey ], vValue, hStmt );

        hStmt.azPopulate.push( hiModels[ zKey ].zTableName );

        } // new context is a model

      else
        throw new kcMysqlgooseError(
          '$orderby field ' + zKey + ' not found' );

      } // zKey

  return hStmt;

  } // fhAddOrderByToStmt


//-----------------------------------------------------------------------------
//  @function fAssertNoLimitSkipOrderby
//  @private
//
//  @summary
//    Prohibits `$limit`, `$skip` and `$orderby` substatements.
//
//  @param {string} zOp
//    The operator containing the substatement.
//
//  @param {Object} hSubstmt
//    The substatement to check.
//
//  @throws {MysqlgooseError}
//    If the substatement contains a `$limit`, `$skip` or `$orderby`.
//-----------------------------------------------------------------------------

function fAssertNoLimitSkipOrderby( zOp, hSubstmt ) {

  [ 'limit', 'skip', 'orderby' ].forEach( zProp => {
    if ( hSubstmt.hasOwnProperty( zProp ) )
      throw new kcMysqlgooseError( zOp + ' cannot contain $' + zProp );
    } );

  } // fAssertNoLimitSkipOrderby


//-----------------------------------------------------------------------------
//  @function fvBuildSqlClauses
//  @private
//
//  @summary
//    Generates the `WHERE`, `ORDER BY` and `LIMIT` clauses for a statement.
//
//  @description
//    Clauses are generated from the specified conditions. This is invoked
//    recursively, or by various methods of
//    {@linkcode module:@aponica/mysqlgoose-js.Model|Model}.
//
//  @param {Model|Object} vContext
//    The context of the current subset of the conditions:
//
//    1. From outside, the current model's schema is passed.
//
//    2. During recursive calls, this is often set to a specific column
//      definition.
//
//    3. When an embedded/nested field is specified in the conditions, this
//      is set to the corresponding `Model` (in which case, the corresponding
//      table is joined as if Mysqlgoose::POPULATE included it).
//
//  @param {Object} hConditions
//    Hash (dictionary object) similar to the object passed to MongoDB for
//    specifying conditions that rows must match.
//
//  @param {Boolean} [bSerialize=false]
//    If `true`, return the serialized results;
//    otherwise, returns the components.
//
//  @param {string} [zAnd=""]
//    In recursive cases, this will usually be the word `AND` to append the
//    condition to others. Otherwise, it is an empty string.
//
//  @returns {Array|Object}
//    If `bSerialize` is `true`, an array is returned with these members:
//
//      [0] (string)
//        A list of clauses with ? placeholders where values
//        must be substituted;
//
//      [1] (*[])
//        The values to substitute for the placeholders;
//
//      [2] (string[])
//        The table names to be joined.
//
//    If `bSerialize` is `false` or not provided (intended to be used when the
//    function is called recursively), returns a hash (dictionary) object
//    containing:
//
//      zWhere (string)
//        The `WHERE` conditions (without the keyword `WHERE`,
//        and possibly empty), with `?` placeholders where values must be
//        substituted.
//
//      avValues (*[])
//        A (possibly empty) array of values to substitute for the
//        WHERE placeholders.
//
//      orderby (string)
//        The `ORDER BY` conditions (without the keywords `ORDER BY`,
//        and possibly empty). This member is named to match the filter
//        name (without $) to simplify error detection.
//
//      skip (number)
//        The number of records to skip in the results (possibly 0).
//        This member is named to match the filter name (without $) to
//        simplify error detection.
//
//      limit (number)
//        The number of records to return in the results (0=unlimited).
//        This member is named to match the filter name (without $) to
//        simplify error detection.
//
//      azPopulate (string[])
//        list of tables to populate into nested values.
//
//  @throws {MysqlgooseError}
//-----------------------------------------------------------------------------

function fvBuildSqlClauses(
  vContext,
  hConditions,
  bSerialize = true,
  zAnd = ""
  ) {

  let azContextColumn = (
    ( vContext instanceof Model ) ?
      [ '[unspecified', 'field]' ] :
      fazQualifiedColumn( vContext )
    );

  let hSubstmt = null;

  let hStmt = { zWhere: '', avValues: [], azPopulate: [] };

  for ( let zProp in hConditions ) { // each condition

    if ( ! hConditions.hasOwnProperty( zProp ) )
      continue;

    let vValue = hConditions[ zProp ];

    switch ( zProp ) {

      case '$and':

        if ( ! Array.isArray( vValue ) )
          throw new kcMysqlgooseError( '$and must be an array' );

        if ( 2 > vValue.length )
          throw new kcMysqlgooseError( '$and array must have 2+ members' );

        hStmt.zWhere += ` ${zAnd} ( `;

        for (let n = 0; n < vValue.length; n++) { // each AND condition

          if ( ! ( ( n in vValue ) && ( 'object' === typeof vValue[ n ] ) ) )
            throw new kcMysqlgooseError( '$and array member #' + n +
              ' must be an object' );

          hSubstmt = fvBuildSqlClauses( vContext, vValue[n], false, zAnd );

          fAssertNoLimitSkipOrderby( zProp, hSubstmt );

          hStmt.azPopulate = hStmt.azPopulate.concat(  hSubstmt.azPopulate );

          if ( 0.5 < n )
            hStmt.zWhere += ' AND ';

          hStmt.zWhere += '( ' + hSubstmt.zWhere + ' )';

          hStmt.avValues = hStmt.avValues.concat( hSubstmt.avValues );

          } // each AND condition

        hStmt.zWhere += ' )';
        break;

      case '$comment':

        break;

      case '$eq':

        hStmt.avValues.push( ...azContextColumn );

        if ( null === vValue )
          hStmt.zWhere += `${zAnd} ??.?? IS NULL`;

        else if ( 'boolean' === typeof vValue )
          hStmt.zWhere += `${zAnd} ??.?? IS ` + ( vValue ? 'TRUE' : 'FALSE' );

        else {
          hStmt.zWhere += `${zAnd} ??.?? = ?`;
          hStmt.avValues.push( fvCastForBinding( vValue, vContext ) );
          }

        break;

      case '$exists':

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere +=
          vValue ? `${zAnd} ??.?? IS NOT NULL` : `${zAnd} ??.?? IS NULL`;

        break;

      case '$gt':

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? > ?`;

        hStmt.avValues.push( fvCastForBinding( vValue, vContext ) );

        break;

      case '$gte':

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? >= ?`;

        hStmt.avValues.push( fvCastForBinding( vValue, vContext ) );

        break;

      case '$in':

        if ( ( ! Array.isArray( vValue ) ) || ( 0.5 > vValue.length ) )
          throw new kcMysqlgooseError( '$in requires [ value, ... ]' );

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? IN ( ? `;

        hStmt.avValues.push( fvCastForBinding( vValue[ 0 ], vContext ) );

        for (let n = 1; n < vValue.length; n++ ) {
          hStmt.zWhere += `, ?`;
          hStmt.avValues.push( fvCastForBinding( vValue[ n ], vContext ) );
          }

        hStmt.zWhere += ' )';

        break;

      case '$limit':

        if ('limit' in hStmt)
          throw new kcMysqlgooseError( '$limit can only appear once' );

        hStmt.limit = Math.floor( vValue );

        break;

      case '$lt':

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? < ?`;

        hStmt.avValues.push( fvCastForBinding( vValue, vContext ) );

        break;

      case '$lte':

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? <= ?`;

        hStmt.avValues.push( fvCastForBinding( vValue, vContext ) );

        break;

      case '$meta':

        throw new kcMysqlgooseError( '$meta not supported because $text uses LIKE' );

        // break;

      case '$mod':

        if ( ! ( Array.isArray( vValue ) && ( 2 === vValue.length ) ) )
          throw new kcMysqlgooseError( '$mod requires [ divisor, remainder ]' );

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? % ? = ?`;

        hStmt.avValues.push( fvCastForBinding( vValue[ 0 ], vContext ) );

        hStmt.avValues.push( fvCastForBinding( vValue[ 1 ], vContext ) );

        break;

      case '$ne':

        hStmt.avValues.push( ...azContextColumn );

        if ( ( undefined === vValue ) || ( null === vValue ) )
          hStmt.zWhere += `${zAnd} ??.?? IS NOT NULL`;

        else if ('boolean' === typeof vValue)
          hStmt.zWhere += `${zAnd} ??.?? IS NOT ` + (vValue ? 'TRUE' : 'FALSE');

        else {
          hStmt.zWhere += `${zAnd} ??.?? != ?`;
          hStmt.avValues.push( fvCastForBinding( vValue, vContext ) );
          }

        break;

      case '$nin':

        if ( ( ! Array.isArray( vValue ) ) || ( 0.5 > vValue.length ) )
          throw new kcMysqlgooseError( '$nin requires [ value, ... ]' );

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? NOT IN ( ? `;

        hStmt.avValues.push( fvCastForBinding( vValue[ 0 ], vContext ) );

        for ( let n = 1; n < vValue.length; n++) {
          hStmt.zWhere += ', ?';
          hStmt.avValues.push( fvCastForBinding( vValue[ n ], vContext ) );
          }

        hStmt.zWhere += ' )';

        break;

      case '$not':

        if ( 'string' === typeof vValue ) { // assume regex; negate

          hStmt.avValues.push( ...azContextColumn );

          hStmt.zWhere += `${zAnd} ??.?? NOT REGEXP ?`;

          hStmt.avValues.push( fvCastForBinding( vValue, vContext ) );

          } // assume regex; negate

        else if ( 'object' !== typeof vValue )
          throw new kcMysqlgooseError(
            'use $ne instead of $not to test values' );

        else { // object

          hSubstmt = fvBuildSqlClauses( vContext, vValue, false, zAnd );

          fAssertNoLimitSkipOrderby( zProp, hSubstmt );

          hStmt.azPopulate = hStmt.azPopulate.concat(  hSubstmt.azPopulate );

          hStmt.zWhere += ` ${zAnd} NOT (` + (hSubstmt.zWhere + ' )');

          hStmt.avValues = hStmt.avValues.concat( hSubstmt.avValues );

          } // object

        break;

      case '$or':

        if (!Array.isArray(vValue))
          throw new kcMysqlgooseError( '$or must be an array' );

        if (2 > vValue.length)
          throw new kcMysqlgooseError( '$or array must have 2+ members' );

        hStmt.zWhere += zAnd + ' (';

        for ( let n = 0; n < vValue.length; n++) {

          if ( ! ( ( n in vValue ) && ( 'object' === typeof vValue[ n ] ) ) )
            throw new kcMysqlgooseError( '$or array member #' + n +
              ' must be an object' );

          hSubstmt = fvBuildSqlClauses( vContext, vValue[ n ], false );

          fAssertNoLimitSkipOrderby( zProp, hSubstmt );

          hStmt.azPopulate = hStmt.azPopulate.concat(  hSubstmt.azPopulate );

          if ( 0.5 < n )
            hStmt.zWhere += ' OR';

          hStmt.zWhere += ' ( ' + (hSubstmt.zWhere + ' )');

          hStmt.avValues = hStmt.avValues.concat( hSubstmt.avValues );

        } // n

        hStmt.zWhere += ' )';
        break;

      case '$orderby':

        if ( 'object' !== typeof vValue )
          throw new kcMysqlgooseError( '$orderby must be a hash object' );

        hStmt = fhAddOrderByToStmt( vContext, vValue, hStmt );
        break;

      case '$query':

        throw new kcMysqlgooseError( 'specify a query without $query' );

        // break;

      case '$regex':

        if ( vValue instanceof RegExp )
          throw new kcMysqlgooseError(
            'specify $regex value as a string (without delimiters)' );

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? REGEXP ?`;

        hStmt.avValues.push( fvCastForBinding( vValue, vContext ) );

        break;

      case '$skip':

        if ( hStmt.hasOwnProperty( 'skip' ) )
          throw new kcMysqlgooseError( '$skip can only appear once' );

        hStmt.skip = Math.floor( vValue );

        break;

      case '$text':

        if ( ! ( ( 'object' === typeof vValue ) &&
          vValue.hasOwnProperty( '$search' ) ) )
            throw new kcMysqlgooseError( '$text requires $search' );

        if ( vValue.hasOwnProperty( '$caseSensitive' ) )
          throw new kcMysqlgooseError(
            'use $language instead of $caseSensitive' );

        if ( vValue.hasOwnProperty( '$diacriticSensitive' ) )
          throw new kcMysqlgooseError(
            'use $language instead of $diacriticSensitive' );

        hStmt.avValues.push( ...azContextColumn );

        hStmt.zWhere += `${zAnd} ??.?? LIKE ?`;

        hStmt.avValues.push(
          fvCastForBinding( vValue['$search'], vContext ) );

        if ( vValue.hasOwnProperty( '$language' ) ) {
          hStmt.zWhere += ' COLLATE ?';
          hStmt.avValues.push(
            fvCastForBinding( vValue['$language'], vContext ) );
          }

        break;

      default:

        if ( zProp.startsWith('$') )
          throw new kcMysqlgooseError( zProp + ' is not supported' );

        //  If the new context is a column definition, remember it, and
        //  remember its qualified name to insert into the query string.

        let vNewContext = null;

        if ( ( vContext instanceof Model ) &&
          vContext.iSchema.hhColDefs.hasOwnProperty( zProp ) )
            { // column context

            vNewContext = { iModel: vContext, zColumnName: zProp };

            azContextColumn = fazQualifiedColumn( vNewContext );

            } // column context

        //  If the new context is a model, remember it, remember to populate
        //  it, and clear out any prior context column name.

        else if ( hiModels.hasOwnProperty( zProp ) )
          { // model context

          vNewContext = hiModels[ zProp ];

          hStmt.azPopulate.push( vNewContext.zTableName );

          azContextColumn = [ '[unspecified', 'field]' ];

          } // model context

        else
          throw new kcMysqlgooseError( 'unknown column: ' + zProp );


        if ( ( undefined === vValue ) || ( null === vValue ) ) {
          hStmt.avValues.push( ...azContextColumn );
          hStmt.zWhere += `${zAnd} ??.?? IS NULL`;
          }

        else if ( 'boolean' === typeof vValue ) {
          hStmt.avValues.push( ...azContextColumn );
          hStmt.zWhere += `${zAnd} ??.?? IS ` + (vValue ? 'TRUE' : 'FALSE');
          }

        else if ( 'object' === typeof vValue ) { // sub-statement

          hSubstmt = fvBuildSqlClauses( vNewContext, vValue, false, zAnd );

          hStmt.azPopulate = hStmt.azPopulate.concat( hSubstmt.azPopulate );

          hStmt.zWhere += hSubstmt.zWhere;

          if ( hSubstmt.hasOwnProperty( 'orderby' ) ) { // orderby

            if ( hStmt.hasOwnProperty( 'orderby') )
              hStmt.orderby += ', ' + hSubstmt.orderby;

            else
              hStmt.orderby = hSubstmt.orderby;

            } // orderby

          if ( hSubstmt.hasOwnProperty( 'skip' ) ) { // skip

            if ( hStmt.hasOwnProperty( 'skip') )
              throw new kcMysqlgooseError( '$skip can only appear once' );

            hStmt.skip = hSubstmt.skip;

            } // skip

          if ( hSubstmt.hasOwnProperty( 'limit' ) ) { // limit

            if ( hStmt.hasOwnProperty( 'limit') )
              throw new kcMysqlgooseError( '$limit can only appear once' );

            hStmt.limit = hSubstmt.limit;

            } // limit

          hStmt.avValues = hStmt.avValues.concat( hSubstmt.avValues );

          } // sub-statement

        else { // scalar, hopefully

          hStmt.avValues.push( ...azContextColumn );

          hStmt.zWhere += `${zAnd} ??.?? = ?`;

          hStmt.avValues.push( fvCastForBinding( vValue, vNewContext ) );

          } // scalar, hopefully

      } // switch

    if ( 0.5 < hStmt.zWhere.length )
      zAnd = ' AND';

    } // each condition

  if ( ! bSerialize )
    return hStmt;

  let clauses = '';

  if ( 0 < hStmt.zWhere.length )
    clauses += ' WHERE ' + hStmt.zWhere;

  if ( hStmt.hasOwnProperty( 'orderby' ) )
    clauses += ' ORDER BY ' + hStmt.orderby;

  if ( hStmt.hasOwnProperty( 'limit' ) ||
    hStmt.hasOwnProperty( 'skip' ) ) { // limit

      clauses += ' LIMIT ';

      if ( hStmt.hasOwnProperty( 'skip' ) )
        clauses += hStmt.skip + ',';

      if ( ! hStmt.hasOwnProperty( 'limit' ) )
        throw new kcMysqlgooseError( 'cannot use $skip without $limit' );

      clauses += hStmt.limit;

      } // limit

  return [ clauses, hStmt.avValues, hStmt.azPopulate ];

  } // fvBuildSqlClauses


//-----------------------------------------------------------------------------
//  @function fvCastForBinding
//  @private
//
//  @summary
//    Casts a value to the type suitable for a SQL statement.
//
//  @param {Boolean|Date|number|string} vValue
//    The value to be cast.
//
//  @param {Object} hContext
//    the context for the column.
//
//  @returns {Date|number|string}
//    The value, cast to the correct type for a prepared SQL statement.
//
//  @throws kcMysqlgooseError
//-----------------------------------------------------------------------------

function fvCastForBinding( vValue, hContext ) {

  const hColDef =
    hContext.iModel.iSchema.hhColDefs[ hContext.zColumnName ];

  if ( null !== vValue )
    switch ( hColDef.zType ) {

      case 'char':
      case 'text':
      case 'varchar':

        if ( 'string' !== typeof vValue )
          vValue = `${vValue}`;

        break;

      case 'datetime':
      case 'timestamp':

        if ( ! ( vValue instanceof Date ) )
          throw new kcMysqlgooseError(
            hColDef.zColumnName + ' must be a Date' );

        break;

      case 'decimal':

        if ( 'string' === typeof vValue )
          vValue = Number( vValue );

        if ( isNaN( vValue ) )
          throw new kcMysqlgooseError(
              hColDef.zColumnName + ' must be numeric' );

        vValue = kfSprintf( '%' + hColDef.nPrecision + '.' +
          hColDef.nScale + 'f', vValue );

        break;

      default:

        if ( 'boolean' === typeof vValue )
          vValue = ( vValue ? 1 : 0 );

      } // switch

  return vValue;

  } // fvCastForBinding


//-----------------------------------------------------------------------------
//  @function fazQualifiedColumn
//  @private
//
//  @summary
//    Returns the values for the qualified column name for a column context.
//
//  @param {Object} hContext
//    A hash (dictionary) object containing:
//
//      @param {Model} hContext.iModel
//        A model.
//
//      @param {string} hContext.zColumnName
//        The name of a column in the model.
//
//  @returns {Array}
//    An array with two members:
//
//      [0] (string)
//        The table name.
//
//      [1] (string)
//        The column name.
//-----------------------------------------------------------------------------

function fazQualifiedColumn( hContext ) {

  return [ hContext.iModel.zTableName, hContext.zColumnName ];

  } // fazQualifiedColumn


//-----------------------------------------------------------------------------
//  @alias module:@aponica/mysqlgoose-js.Model
//
//  @public
//
//  @classdesc
//    Provides methods for storing and retrieving documents.
//
//    Used like MongooseJS's
//    {@linkcode https://mongoosejs.com/docs/api/model.html|Model} class.
//
//    Do **not** instantiate a `Model` directly; call {@linkcode
//    module:@aponica/mysqlgoose-js.Mysqlgoose#model|Mysqlgoose.model}
//    instead.
//
//    Only a subset of the methods provided by MongooseJS's class are
//    currently supported, and not always in a fully-compatible way.
//    For most cases, however, there's enough to get by.
//-----------------------------------------------------------------------------

class Model {

  //---------------------------------------------------------------------------
  //  @summary
  //    Constructs a model for a specified table name.
  //
  //  @description
  //    Do **not** use this constructor; call {@linkcode
  //    module:@aponica/mysqlgoose-js.Mysqlgoose#model|Mysqlgoose.model}
  //    instead.
  //
  //  @param {string} zTable
  //    The name of the table.
  //
  //  @param {Schema} iSchema
  //    The `Schema` for the table/model.
  //
  //  @param {Mysqlgoose} iGoose
  //    The `Mysqlgoose` for the database owning the table.
  //
  //  @see module:@aponica/mysqlgoose-js.Mysqlgoose#model
  //---------------------------------------------------------------------------

  constructor( zTable, iSchema, iGoose ) {

    this.iGoose = iGoose;
    this.iGoose.debug( zTable, "constructor" );
    this.iSchema = iSchema;
    this.zTableName = zTable;
    this.zSafeTableName = this.iGoose.getConnection().escapeId( zTable );
    hiModels[ zTable ] = this;

    } // constructor()


  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Saves a new document to the database.
  //
  //  @description
  //    Currently this is the only way to save a new document, and it only
  //    saves one document to a single table.
  //
  //  @param {Object} hDoc
  //    Hash (dictionary) object representing a table row.
  //
  //  @returns {Promise<Object>}
  //    The saved record from the database as a hash (dictionary) object.
  //---------------------------------------------------------------------------

  create( hDoc ) {

    this.iGoose.debug( this.zTableName, 'create', hDoc );

    return new Promise( ( fResolve, fReject ) => {

      const [ zList, avValues ] = this.favSqlSetValues( hDoc,true );

      avValues.unshift( this.zTableName );

      this.iGoose.fiQuery(
        `INSERT INTO ?? SET ${zList}`,
        avValues
        ).then(

          hResults => { // resolved

            const nId = (
              hResults.insertId ||
              ( ( null !== this.iSchema.zIdField ) ?
                hDoc[ this.iSchema.zIdField ] :
                false
                )
              ); // nId

            if ( ! nId )
              fReject( new kcMysqlgooseError( 'missing insert ID' ) );

            else
              this.findById( nId ).then( fResolve, fReject );

            }, // resolved

          iErr => fReject( iErr )

          ); // then()

      } ); // Promise()

    } // create


  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Finds one or more documents matching specified conditions.
  //
  //  @description
  //    Resolve with an array of hash (dictionary) objects, each containing
  //    the columns for a matching row (and possibly nested rows from related
  //    tables).
  //
  //    If `hOptions` includes a member named `[Mysqlgoose.POPULATE]`, or the
  //    `hFilter` includes an embedded (nested) field, then this behaves
  //    similar to chaining a .populate() call to a MongooseJS query: each
  //    resulting hash will contain nested hash objects for the populated
  //    associations, where the property name (index) for the nested hash is
  //    the name of the corresponding table. Note that this only works if the
  //    outer table has a field that references the primary key of the embedded
  //    table.
  //
  //    *Note:* The examples that follow assume a table named `customer` with
  //    columns named `bVerified` and `zName`, and a table named `order` with
  //    a column named `bActive` and a column (name unspecified) that provides
  //    a foreign key to the `customer` table.
  //
  //  @param {number|Object} [vFilter]
  //    Either a row ID number (matching the primary key field), or a
  //    {@link
  //    https://docs.mongodb.com/manual/tutorial/query-documents/|query document}
  //    similar to those supported by MongoDB.
  //
  //  @param {string} [zProjection]
  //    String specifying a list of fields names to be returned or excluded.
  //    **This is currently ignored,** but included for consistency with
  //    MongooseJS and intended to be implemented in the future.
  //
  //  @param {Object} [hOptions]
  //    Options. Currently, only a member named `[Mysqlgoose.POPULATE]` is
  //    recognized.
  //
  //    @param {string[]} [hOptions.[Mysqlgoose.POPULATE]]
  //      The names of all related tables that should be included in the
  //      result documents. Note that `Mysqlgoose.POPULATE` is a `Symbol`
  //      and must therefore by specified within square brackets.
  //
  //  @example <caption>basic example</caption>
  //    customerModel.find( { zName: 'John Doe' } );
  //
  //  @example <caption>example w/automatic population</caption>
  //    orderModel.find( { customer: { bVerified: true } } );
  //
  //  @example <caption>example w/explicit population</caption>
  //    orderModel.find( { bActive: true }, null,
  //      { [ Mysqlgoose.POPULATE ] : [ 'customer' ] } );
  //
  //  @returns {Promise<Object[]>}
  //    Array of hash (dictionary) objects, each containing the column
  //    name-value pairs for a matching row (and possibly nested tables).
  //
  //  @throws {Error|MysqlgooseError}
  //
  //  @see {@link
  //    https://docs.mongodb.com/manual/tutorial/query-documents/|
  //    MongoDB Query Documents}
  //
  //  @see {@link
  //    https://docs.mongodb.com/manual/reference/operator/query/#query-selectors|
  //    MongoDB Query Filters}
  //---------------------------------------------------------------------------

  find( vFilter = {}, zProjection = null, hOptions = {} ) {

    this.iGoose.debug( this.zTableName, 'find',
      vFilter, zProjection, hOptions );

    return new Promise( ( fResolve, fReject ) => {

      if ( hOptions.hasOwnProperty( kcMysqlgoose.POPULATE ) &&
        ( ! Array.isArray( hOptions[ kcMysqlgoose.POPULATE ] ) ) )
          throw new kcMysqlgooseError( 'option POPULATE must be an array' );

      const hSettings = Object.assign(
        { [ kcMysqlgoose.POPULATE ]: [] }, hOptions );


      //  Build the query for this table.

      try {

        let [zClauses, avValues, azPopulate ] =
          fvBuildSqlClauses( this, vFilter );

        let zSelect = null;

        avValues.unshift( this.zTableName );

        let zFrom = 'FROM ??';

        for (let zCol in this.iSchema.hhColDefs) {

          const hDefs = this.iSchema.hhColDefs[zCol];

          avValues.unshift( this.zTableName, hDefs.zColumnName );

          if ( null === zSelect )
            zSelect = 'SELECT ??.??';
          else
            zSelect += ', ??.??';

          } // zCol

        //  If any embedded (nested) tables were referenced, add them as joins.

        if ( 0.5 < azPopulate.length ) // add referenced tables
          hSettings[ kcMysqlgoose.POPULATE ] =
            azPopulate.concat(  hSettings[ kcMysqlgoose.POPULATE ] );


        //  If we're supposed to populate linked tables, so first add the right
        //  column names to the query, and figure out where the joins are.

        const hazLinkedModels = {};

        if ( hSettings[ kcMysqlgoose.POPULATE ].length ) { // populate joins

          const azModelNames = hSettings[ kcMysqlgoose.POPULATE ].
            filter( ( z, n, a ) => a.indexOf( z ) === n );

          let [ zJoinClauses, azAlreadyJoined] =
            this.favSqlJoin(azModelNames, [] );

          hazLinkedModels[ this.zTableName ] = azAlreadyJoined;

          zFrom += zJoinClauses;

          azModelNames.forEach( zModelName => { // each model

            const iModel = hiModels[ zModelName ];

            for ( let zCol in iModel.iSchema.hhColDefs ) { // each column

              const hDefs = iModel.iSchema.hhColDefs[zCol];

              zSelect +=
                ', ' + iModel.zSafeTableName + '.' + hDefs.zSafeColumnName +
                " AS '" + iModel.zTableName + '>' + hDefs.zColumnName + "'";

              } // each column

            let [zJoinClauses, azContains] =
              iModel.favSqlJoin( azModelNames, azAlreadyJoined );

            azAlreadyJoined = azAlreadyJoined.concat( azContains );

            hazLinkedModels[ zModelName ] = azContains;

            zFrom += zJoinClauses;

            } ); // forEach() // each model

        } // populate joins


        //  Perform the query, then create separate objects to represent the
        //  populated results.

        this.iGoose.fiQuery( `${zSelect} ${zFrom} ${zClauses}`, avValues ).
          then( // query promised
            ahResults => { // query success

              const ahReturnArray = [];

              ahResults.forEach( hRow => {

                //  Store each column from the result in its table's array

                const hhvObjects = {};
                for ( let zName in hRow ) { // each column

                  const vValue = hRow[ zName ];

                  const azParts = zName.split(">");

                  const [ zTable, zCol ] =
                    ( 1 === azParts.length ) ?
                      [ this.zTableName, azParts[0] ] :
                      azParts;

                  if ( ! ( zTable in hhvObjects ) )
                    hhvObjects[zTable] = {};

                  switch( hiModels[ zTable ].iSchema.hhColDefs[ zCol ].zType )
                    { // type conversion

                    case 'decimal':
                      hhvObjects[ zTable ][ zCol ] =
                        ( ( null === vValue ) ? vValue :
                          Number.parseFloat( vValue ) );
                      break;

                    default:
                      hhvObjects[ zTable ][ zCol ] = vValue;

                    } // type conversion

                  } // each column


                //  Inject each table as a nested array within the table that
                //  links to it.

                for ( let zContainerName in hazLinkedModels ) {

                  const azContainerContents = hazLinkedModels[ zContainerName ];

                  azContainerContents.forEach( zContained =>
                    hhvObjects[zContainerName][ zContained ] =
                      hhvObjects[zContained] );

                  } // zContainerName


                //  Save this substructure in the results.

                ahReturnArray.push( hhvObjects[ this.zTableName ] );

                } ); // forEach(hRow)

              fResolve( ahReturnArray );

              }, // query success

            fReject

            ); // query promised

        }
      catch( err ) {
        fReject( err );
        }

      } ); // new Promise()

    } // find

  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Finds the document matching the specified ID.
  //
  //  @description
  //    Resolves with a single hash (dictionary) object containing the columns
  //    for the matching row (and possibly nested rows from related tables).
  //
  //    This is a wrapper for
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#findOne|Model.findOne},
  //    which in turn is essentially a wrapper for
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#find|Model.find}.
  //
  //  @param {number} nId
  //    The row ID number (matching the primary key).
  //
  //  @param {string} [zProjection]
  //    String specifying a list of fields names to be returned or excluded.
  //    **This is currently ignored,** but included for consistency with
  //    MongooseJS and intended to be implemented in the future.
  //
  //  @param {Object} [hOptions]
  //    Hash (dictionary object) of options expected by
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#find|Model.find}.
  //
  //  @returns {Promise<Object>}
  //    Hash (dictionary) object containing the column name-value pairs for
  //    the specified row (and possibly nested tables).
  //
  //  @throws {Error|MysqlgooseError}
  //---------------------------------------------------------------------------

  findById( nId, zProjection = null, hOptions = {}) {

    this.iGoose.debug( this.zTableName, 'findById',
      nId, zProjection, hOptions );

    if ( null === this.iSchema.zIdField )
      return new Promise( ( fResolve, fReject ) =>
        fReject( new kcMysqlgooseError( 'no primary key for ' + this.zTableName ) )
        );

    return this.findOne( { [ this.iSchema.zIdField ]: nId },
      zProjection, hOptions);

    } // findById


  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Removes the document matching the specified ID.
  //
  //  @description
  //    This is a wrapper for {@linkcode
  //    module:@aponica/mysqlgoose-js.Model#findById|Model.findById} and
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#remove|Model.remove}.
  //
  //  @param {number} nId
  //    The row ID number (matching the primary key).
  //
  //  @param {Object} [hOptions]
  //    Hash (dictionary object) of options expected by
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#find|Model.find}.
  //
  //  @returns {Promise<Object>}
  //    Hash (dictionary) object containing the column name-value pairs for
  //    the removed row (and possibly nested tables).
  //
  //  @throws {Error|MysqlgooseError}
  //---------------------------------------------------------------------------

  findByIdAndRemove( nId, hOptions = {} ) {

    this.iGoose.debug( this.zTableName, "findByIdAndRemove", nId, hOptions );

    return new Promise( ( fResolve, fReject ) => {

      this.findById( nId, undefined, hOptions ).then(
        hDoc =>
          this.remove(
            { [ this.iSchema.zIdField ] : nId },
            { single: true } ).then(
              hResult => {
                if ( 1 === hResult.nRemoved )
                  fResolve( hDoc );
                else
                  fReject( new kcMysqlgooseError(
                    hResult.nRemoved + ' rows deleted' ) );
                },
              fReject
              ), // then()
        fReject
        ); // then()

      } ); // Promise()

    } // findByIdAndRemove


  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Updates the row matching the ID to resemble the specified document.
  //
  //  @param {number} nId
  //    The row ID number (matching the primary key).
  //
  //  @param {Object} hUpdate
  //    Hash (dictionary) object containing changes to the document.
  //    Note that this need not be a complete *replacement*, but merely
  //    specifies those columns that should be changed.
  //
  //    Columns in related tables cannot currently be updated.
  //
  //  @param {Object} [hOptions]
  //    Hash (dictionary object) of options expected by
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#find|Model.find}.
  //
  //  @returns {Promise<Object>}
  //    Hash (dictionary) object containing the column name-value pairs for
  //    the updated row (and possibly nested tables).
  //
  //  @throws {Error|MysqlgooseError}
  //---------------------------------------------------------------------------

  findByIdAndUpdate( nId, hUpdate, hOptions = {} ) {

    this.iGoose.debug( this.zTableName, "findByIdAndUpdate",
      nId, hUpdate, hOptions );

    return new Promise( ( fResolve, fReject ) => {

      try {

        if ( null === this.iSchema.zIdField )
          throw new kcMysqlgooseError( 'no primary key for ' + this.zTableName );

        let [ zSetList, avValues ] = this.favSqlSetValues( hUpdate );

        const [ zClauses, avClauseValues, ] =
          fvBuildSqlClauses( this, { [ this.iSchema.zIdField ]: nId } );

        avValues = avValues.concat( avClauseValues );

        avValues.unshift( this.zTableName );

        this.iGoose.fiQuery(
          `UPDATE ?? SET ${zSetList} ${zClauses}`,
          avValues
          ).then(

            hResult => { // resolved

              if ( ( ! hResult.hasOwnProperty( 'affectedRows' ) ) ||
                ( 1 != hResult.affectedRows ) )
                  fReject( new kcMysqlgooseError(
                    hResult.affectedRows + ' rows updated' ) );

              this.findById( nId, hOptions ).then( fResolve, fReject );

              }, // resolved

            iErr => {
              fReject( iErr );
              }

            ); // then()
        }
      catch(err) {
        fReject(err);
        }

      } ); // Promise()

    } // findByIdAndUpdate


  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Finds the first document matching specified conditions.
  //
  //  @description
  //    Resolves with a single hash (dictionary) object containing the columns
  //    for the first matching row (and possibly nested rows from related
  //    tables).
  //
  //    This is essentially a wrapper for
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#find|Model.find}.
  //
  //  @param {number|Object} vFilter
  //    Either a row ID number (matching the primary key field), or a hash
  //    (dictionary) object similar to those supported by MongooseJS/MongoDB.
  //
  //  @param {string} [zProjection]
  //    String specifying a list of fields names to be returned or excluded.
  //    **This is currently ignored,** but included for consistency with
  //    MongooseJS and intended to be implemented in the future.
  //
  //  @param {Object} [hOptions]
  //    Hash (dictionary object) of options expected by
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#find|Model.find}.
  //
  //  @returns {Promise<Object>}
  //    Hash (dictionary) object containing the column name-value pairs for
  //    the first matching row (and possibly nested tables).
  //
  //  @throws {Error|MysqlgooseError}
  //---------------------------------------------------------------------------

  findOne( vFilter, zProjection = null, hOptions = {} ) {

    this.iGoose.debug( this.zTableName, "findOne",
      vFilter, zProjection, hOptions );

    return new Promise(( fResolve, fReject ) => {

      vFilter[ '$limit' ] = 1;

      this.find( vFilter, zProjection, hOptions ).then(
        ahResults => fResolve( ahResults.length ? ahResults[0] : null ),
        fReject
        );

      } ); // Promise()

    } // findOne


  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Removes one or more documents matching specified conditions.
  //
  //  @param {number|Object} vFilter
  //    Either a row ID number (matching the bPrimary field), or a hash
  //    (dictionary) object similar to that supported by MongooseJS/MongoDB.
  //
  //  @param {Object} [hOptions]
  //    Options. Currently, only { single } is recognized.
  //
  //      @param {Boolean} hOptions.single
  //        If true, only the first matching document should be removed.
  //        This is the same as specifying filter `{"$limit":1}` (and will
  //        be overridden by `vFilter.$limit` if both are specified).
  //
  //  @returns {Promise<Object>}
  //    Hash (dictionary) object containing:
  //
  //      nRemoved (number)
  //        The number of documents removed.
  //
  //  @throws {Error|MysqlgooseError}
  //---------------------------------------------------------------------------

  remove( vFilter, hOptions = {} ) {

    this.iGoose.debug( this.zTableName, 'remove', vFilter, hOptions );

    return new Promise( ( fResolve, fReject ) => {

      try {

        if ( hOptions.hasOwnProperty( 'single' ) )
          vFilter = Object.assign( { '$limit' : 1 }, vFilter );

        const [ zClauses, avValues, ] = fvBuildSqlClauses( this, vFilter );

        avValues.unshift( this.zTableName );

        this.iGoose.fiQuery(
          `DELETE FROM ?? ${zClauses}`,
          avValues ).then(
            hResult => fResolve( { nRemoved: hResult.affectedRows } ),
            fReject
            ); // then()
        }
      catch( iErr ) {
        fReject( iErr );
        }

      } ); // Promise()

    } // remove


  //---------------------------------------------------------------------------
  //  @private
  //
  //  @summary
  //    Creates clauses to populate a document's linked table data.
  //
  //  @description
  //    This must only be invoked by
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#find|Model.find}.
  //
  //  @param {string[]} azModelNames
  //    The names of linked tables that should be populated.
  //
  //  @param {string[]} azAlreadyJoined
  //    Names of linked tables that have already been joined (and should not
  //    be joined again).
  //
  //  @returns {Array}
  //    An array with the following members:
  //
  //      [0] (string)
  //        The LEFT JOIN clauses to add to the query.
  //
  //      [1] (string[])
  //        The subset of azModelNames that are linked by this model.
  //---------------------------------------------------------------------------

  favSqlJoin( azModelNames, azAlreadyJoined ) {

    let zJoinClauses = '';
    const azLinkedModels = [];

    azModelNames.forEach( zModelName => {

      for ( let zColumn in this.iSchema.hhColDefs ) { // each column

        const hColDef = this.iSchema.hhColDefs[ zColumn ];

        if ( hColDef.hasOwnProperty( 'hReferences' ) &&
          ( hColDef.hReferences.zTable === zModelName ) )
            { // found model

            if ( ! azAlreadyJoined.includes( zModelName ) ) { // join

              const zSTN = hiModels[ zModelName ].zSafeTableName;

              zJoinClauses +=
                '\n  LEFT JOIN ' + zSTN + ' ON ' +
                this.zSafeTableName  + '.' + hColDef.zSafeColumnName +
                ' = ' + zSTN + '.' +
                  hiModels[ zModelName ].iSchema.hhColDefs[
                    hColDef.hReferences.zColumn ].zSafeColumnName;

              azLinkedModels.push( zModelName );

              } // join

            } // found model

        } // each column

      } ); // forEach( zModelName )

    return [ zJoinClauses, azLinkedModels ];

    } // favSqlJoin


  //---------------------------------------------------------------------------
  //  @private
  //
  //  @summary
  //    Creates an assignment string for a SET clause, pulling the name=value
  //    pairs from the specified document.
  //
  //  @description
  //    This must only be invoked by
  //    {@linkcode module:@aponica/mysqlgoose-js.Model#create|Model.create}
  //    and {@linkcode
  //    module:@aponica/mysqlgoose-js.Model#findByIdAndUpdate|Model.findByIdAndUpdate}.
  //
  //  @param {Object} hDoc
  //    Hash (dictionary) object containing property names and values for a
  //    table row.
  //
  //  @param {Boolean} [bIncludeIds=false]
  //    If true, any ID fields should be set to the values specified in the
  //    document. This should only be the case when the record is created.
  //    Defaults to false.
  //
  //  @returns {Array}
  //    An array with the following members:
  //
  //      [0] (string)
  //        The SET string (without the keyword SET), with ? placeholders
  //        where values must be substituted;
  //
  //      [1] (*[])
  //        The values to substitute for the placeholders.
  //---------------------------------------------------------------------------

  favSqlSetValues( hDoc, bIncludeIds = false ) {

    let zList = '';
    let avValues = [];
    let bIdIgnored = false;

    for (let [ zProp, vValue ] of Object.entries( hDoc ) ) { // each prop

      if ( ! this.iSchema.hhColDefs.hasOwnProperty( zProp ) ) // not a column
        throw new kcMysqlgooseError(
          ( 'object' === typeof vValue ) ?
            'nested table update not supported' :
            'unknown column "' + zProp + '"'
          ); // Error()

      if ( bIncludeIds || ( this.iSchema.zIdField !== zProp ) )
          { // not the ID or a nested table

          if (zList)
            zList += ', ';

          zList += '?? = ? ';

          avValues.push(
            zProp,
            fvCastForBinding( vValue,
              { iModel: this, zColumnName: zProp } )
            ); // push

          } // not the ID or a nested table

      else
        bIdIgnored = true;

      } // each prop

    if ( 0.5 > zList.length )
      throw new kcMysqlgooseError( 'no update specified' +
        ( bIdIgnored ? ' (IDs are ignored)' : '' ) );

    return [zList, avValues];

    } // favSqlSetValues

  } // Model

module.exports = Model;

// EOF
