//=============================================================================
//  Copyright 2019-2020 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

//-----------
//  @ignore
//-----------

const kMysql = require('mysql');
const kcMysqlgooseError = require( './MysqlgooseError' );

// ./Model is required inline later due to circular reference.
const kcSchema = require( './Schema' );
const kcSession = require( './Session' );


//-----------------------------------------------------------------------------
//  @public
//
//  @alias module:@aponica/mysqlgoose-js.Mysqlgoose
//
//  @classdesc
//    Establishes and manages a connection to a MySQL database.
//
//    Used like MongooseJS's
//    {@linkcode https://mongoosejs.com/docs/api/mongoose.html|Mongoose} class.
//
//    Only a subset of the methods provided by MongooseJS's class are
//    currently supported, and not always in a fully-compatible way.
//    For most cases, however, there's enough to get by.
//
//    The database is accessed using
//    [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql}.
//-----------------------------------------------------------------------------

class Mysqlgoose {

  //---------------------------------------------------------------------------
  //  @summary
  //    Constructs a Mysqlgoose object.
  //---------------------------------------------------------------------------

  constructor() {
    this.iConn = null;
    this.hOptions = { debug: false };
    }

  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Establishes a database connection using the specified configuration.
  //
  //  @description
  //    The connection is established using
  //    [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql}.
  //
  //  @param {Object} hParams
  //    A hash (dictionary) object containing the following members.
  //
  //      @param {string} hParams.zDatabase
  //        The database name, as expected by
  //        [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql}.
  //        The member can be named `database` instead, if desired.
  //
  //      @param {string} hParams.zHost
  //        The URI of the MySQL server hosting the database, as expected by
  //        [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql}.
  //        The member can be named `host` instead, if desired.
  //
  //      @param {string} hParams.zPassword
  //        The password to use to connect to the MySQL server, as expected by
  //        [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql}.
  //        The member can be named `password` instead, if desired.
  //
  //      @param {string} hParams.zUser
  //        The username to use to connect to the MySQL server, as expected by
  //        [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql}.
  //        The member can be named `user` instead, if desired.
  //
  //      @param {string} [hParams.database]
  //        Alternative to `zDatabase`.
  //
  //      @param {string} [hParams.host]
  //        Alternative to `zHost`.
  //
  //      @param {string} [hParams.password]
  //        Alternative to `zPassword`.
  //
  //      @param {string} [hParams.user]
  //        Alternative to `zUser`.
  //
  //  @throws {Error}
  //---------------------------------------------------------------------------

  connect( hParams ) {

    return new Promise( ( fResolve, fReject ) => {

      this.iConn = kMysql.createConnection(
        { // config
          database: hParams.zDatabase || hParams.database,
          host: hParams.zHost || hParams.host,
          password: hParams.zPassword || hParams.password,
          user: hParams.zUser || hParams.user
          }, // config
        { debug: this.hOptions.debug }
        ); // createConnection()

      this.iConn.connect( function( iErr ) {
        if ( iErr ) fReject( iErr );
        else fResolve();
        } ); // .connect()

      } ); // new Promise()

    } // connect


  //---------------------------------------------------------------------------
  //  @package
  //
  //  @summary
  //    Logs a debugging message if appropriate.
  //
  //  @description
  //    Do not called this method directly; it is used internally when
  //    debugging has been enabled by a call to
  //    {@linkcode module:@aponica/mysqlgoose-js.Mysqlgoose#set|Mysqlgoose.set}
  //
  //  @param {...*} ...avArgs
  //    A list of arguments (of any type) to be logged. Each is converted
  //    to a string using JSON.stringify().
  //
  //  @see {@linkcode module:@aponica/mysqlgoose-js.Mysqlgoose#set|
  //    Mysqlgoose.set}
  //---------------------------------------------------------------------------

  debug( ...avArgs ) {

    ( ( ( 'boolean' === typeof this.hOptions.debug ) ?
        ( ...avArgs ) => {
          if (this.hOptions.debug) {
            console.info("MysqlgooseDebug:");
            for (let arg of Object.values( avArgs ) )
              console.info( `> ${JSON.stringify(arg)}` );
            }
          } :
        this.hOptions.debug )( ...avArgs ));

    } // debug


  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Closes the database connection.
  //
  //  @throws Error
  //---------------------------------------------------------------------------

  disconnect() {

    return new Promise( ( fResolve, fReject ) =>

      this.iConn.end( iErr => {

        if ( iErr )
          fReject( iErr );
        else
          fResolve();

        } ) // end()

      ); // Promise()

    } // disconnect


  //---------------------------------------------------------------------------
  //  @public
  //
  //  @summary
  //    Retrieves the database connection.
  //
  //  @description
  //    The connection will be as specified by
  //    [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql}.
  //
  //  @returns {Connection}
  //    The database connection.
  //
  //  @see [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql}.
  //---------------------------------------------------------------------------

  getConnection() {
    return this.iConn;
    }


  //---------------------------------------------------------------------------
  //  @public
  //
  //  @summary
  //    Returns a new {@linkcode module:@aponica/mysqlgoose-js.Model|Model}
  //    suitable for managing a table.
  //
  //  @param {string} zName
  //    The table name.
  //
  //  @param {Schema} iSchema
  //    The {@linkcode module:@aponica/mysqlgoose-js.Schema|Schema} for the
  //    table.
  //
  //  @returns {Model}
  //    A Mysqlgoose Model.
  //
  //  @see module:@aponica/mysqlgoose-js.Model
  //  @see module:@aponica/mysqlgoose-js.Schema
  //---------------------------------------------------------------------------

  model( zName, iSchema ) {

    //  The require() must be here due to circular reference, and constant
    //  cModel overcomes errors about require() not being a constructor.

    const cModel = require( './Model' );

    if ( ! Mysqlgoose.hasOwnProperty( 'Model' ) )
      Mysqlgoose.Model = cModel;

    return new cModel( zName, iSchema, this );

    } // model


  //---------------------------------------------------------------------------
  //  @package
  //  @async
  //
  //  @summary
  //    Performs a MYSQL query and provides the results.
  //
  //  @description
  //    Do not called this method directly; it is used internally by various
  //    {@linkcode module:@aponica/mysqlgoose-js.Model|Model} and
  //    {@linkcode module:@aponica/mysqlgoose-js.Session|Session} methods.
  //
  //    **Warning:** The query must be made safe *before* it is passed to this
  //    method.
  //
  //  @param {string} zQuery
  //    The query string to perform, possibly containing `?` characters for
  //    substitution.
  //
  //    **Warning:** This must be made safe prior to passing!
  //
  //  @param {Array} [avValues=[]]
  //    Values to substitute for `?`s in the query string. Each argument may
  //    be of any type.
  //
  //  @returns {Promise}
  //    For DML, resolves with a hash containing:
  //
  //      affectedRows (number)
  //        The number of affected rows.
  //
  //      insertId (number) (optional)
  //        The ID of the inserted row (if applicable).
  //
  //    For a transaction command (COMMIT/ROLLBACK/START TRANSACTION),
  //    resolves with the result.
  //
  //    Otherwise (for queries), resolves with an array of hashes (dictionary
  //    objects), where each hash represents a row of data.
  //
  //  @throws {Error}
  //---------------------------------------------------------------------------

  fiQuery( zQuery, avValues = [] ) {

    return new Promise( ( fResolve, fReject ) => {

      try {
        const zFormatted =  this.getConnection().format( zQuery, avValues );
        this.debug( zFormatted );
        this.getConnection().query(
          zFormatted,
          ( iErr, vResult ) => { // callback
            if ( iErr )
              fReject( iErr );
            else
              fResolve( vResult );
            } // callback
          ); // .query()

        }
      catch ( iErr ) {
        fReject( iErr );
        }

      } ); // new Promise()

    } // fiQuery


  //---------------------------------------------------------------------------
  //  @public
  //
  //  @summary
  //    Sets an option to a value.
  //
  //  @description
  //    Currently, only the `'debug'` option is supported.
  //
  //  @param {string} zKey
  //    The option key (name).
  //
  //    Currently, only `'debug'` is supported.
  //
  //  @param {string} vValue
  //    The option value.
  //
  //    When `zKey` is `'debug'`, `vValue` must be one of:
  //
  //      true
  //        Debug messages will be passed to console.info(), preceded by
  //        the line 'MysqlgooseDebug:'.
  //
  //      false
  //        Debug messages will be suppressed.
  //
  //      function(){...}
  //        Debug messages will be passed to the specified function for
  //        processing.
  //
  //  @returns (Mysqlgoose)
  //    This Mysqlgoose instance.
  //
  //  @see {@linkcode module:@aponica/mysqlgoose-js.Mysqlgoose#debug|
  //    Mysqlgoose.debug}
  //---------------------------------------------------------------------------

  set( zKey, vValue ) {
    this.hOptions[zKey] = vValue;
    return this;
    }

  //---------------------------------------------------------------------------
  //  @public
  //
  //  @summary
  //    Starts a session.
  //
  //  @description
  //    A {@linkcode module:@aponica/mysqlgoose-js.Session|Session} is
  //    required to perform transactions.
  //
  //  @returns {Session}
  //    A new {@linkcode module:@aponica/mysqlgoose-js.Session|Session} object.
  //
  //  @see module:@aponica/mysqlgoose-js.Session
  //---------------------------------------------------------------------------

  startSession() {
    return new kcSession( this );
    }

  } // Mysqlgoose


//-----------------------------------------------------------------------------
//  @public
//
//  @alias module:@aponica/mysqlgoose-js.Mysqlgoose.POPULATE
//
//  @summary
//    Symbol used as a property of the options (`hOptions`) argument passed
//    to various {@linkcode module:@aponica/mysqlgoose-js.Model|Model}
//    commands.
//
//  @type {Symbol}
//
//  @see module:@aponica/mysqlgoose-js.Model
//-----------------------------------------------------------------------------

Mysqlgoose.POPULATE = Symbol();

Mysqlgoose.MysqlgooseError = kcMysqlgooseError;
Mysqlgoose.Schema = kcSchema;
Mysqlgoose.Session = kcSession;

module.exports = Mysqlgoose;

// EOF
