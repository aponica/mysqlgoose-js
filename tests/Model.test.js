//=============================================================================
//  Copyright 2019-2020 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

//-----------------------------------------------------------------------------
//  Unit tests for mysqlgoose-js/Model.js
//-----------------------------------------------------------------------------

const kcMysqlgoose = require( '../index' );

const kfExpectRejection = require( './fExpectRejection' );
const kfExpectResolution = require( './fExpectResolution' );

let iGoose = null;
let hiModels = null;

let nNextProductId = Math.round( (new Date()).getTime() / 1000 );


//-----------------------------------------------------------------------------

function fCompareOrderProducts( hActual, hExpected ) {

  expect( hActual ).toHaveProperty( 'nProductId' );
  expect( hActual.nProductId ).toBe( hExpected.nProductId );

  expect( hActual ).toHaveProperty( 'product' );
  expect( hActual.product ).toHaveProperty( 'nId' );
  expect( hActual.product.nId ).toBe( hExpected.nProductId );

  expect( hActual ).toHaveProperty( 'nOrderId' );
  expect( hActual.nOrderId ).toBe( hExpected.nOrderId );

  expect( hActual ).toHaveProperty( 'order' );
  expect( hActual.order ).toHaveProperty( 'nId' );
  expect( hActual.order.nId ).toBe( hExpected.nOrderId );

  expect( hActual.order ).toHaveProperty( 'nCustomerId' );
  expect( hActual.order.nCustomerId ).toBe( hExpected.order.nCustomerId );

  expect( hActual.order ).toHaveProperty( 'customer' );

  expect( hActual.order.customer ).toHaveProperty( 'nId' );
  expect( hActual.order.customer.nId ).toBe( hExpected.order.nCustomerId );

  expect( hActual.order.customer ).toHaveProperty( 'zName' );
  expect( hActual.order.customer.zName ).toBe(
    ( 1 === hExpected.order.nCustomerId ) ?
      'First Customer' :
      'PopulateOrderJS'
    ); // toBe()

  } // fCompareOrderProducts


//-----------------------------------------------------------------------------

const fExpectRejectionForCustomers = ( fDone, zMessage, hConditions ) =>
  kfExpectRejection( fDone, zMessage, hiModels.customer.find( hConditions ) );


//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------
//-----------------------------------------------------------------------------

beforeAll( () => new Promise( ( fResolve, fReject ) => {

  require( './fiTestMysqlgoose' )().then(

    ( [ i, hi ] ) => { // goose resolved
      iGoose = i;
      hiModels = hi;
      fResolve();
      },

    fReject // goose rejected

    ) // goose promised

  } ) ); // beforeAll()

//-----------------------------------------------------------------------------

test( 'BooleanAlsoOr', fDone => {

  const ahQueries = [
    { hConditions: { bVerified: true }, nExpect: 2 },
    { hConditions: { bVerified: false }, nExpect: 2 },
    { hConditions: { bVerified: null }, nExpect: 2 },
    { hConditions: { bVerified: { $eq: true } }, nExpect: 2 },
    { hConditions: { bVerified: { $eq: false } }, nExpect: 2 },
    { hConditions: { bVerified: { $eq: null } }, nExpect: 2 },
    { hConditions: { bVerified: { $exists: true } }, nExpect: 4 },
    { hConditions: { bVerified: { $exists: false } }, nExpect: 2 },
    { hConditions: { bVerified: { $ne: true } }, nExpect: 4 },
    { hConditions: { bVerified: { $ne: false } }, nExpect: 4 },
    { hConditions: { bVerified: { $ne: null } }, nExpect: 4 },
    { hConditions: { $or: [ { bVerified: true }, { bVerified: false } ] }, nExpect: 4 }
    ]; // ahQueries

  kfExpectResolution( fDone,

    Promise.all( ahQueries.map( hQuery => hiModels.review.find(
      Object.assign(
        { zText: { $regex: '^test-verified ' } },
        hQuery.hConditions )
      ) ) ), // all()

    aaReviews => { // all review lookups resolved

      ahQueries.forEach( ( hQuery, nItem ) => {
        expect( aaReviews[ nItem ] ).toHaveLength( hQuery.nExpect );
        } );

      fDone();

      } // all review lookups resolved

    ); // kfExpectResolution()

  } ); // test(BooleanAlsoOr)


//-----------------------------------------------------------------------------

test( 'CastBooleanDecimalString', fDone => {

  const nId = nNextProductId++;

  const hDoc = {
    nId,
    zName: nId, // numeric to string
    nPrice: '9876.54', // string to decimal
    bDiscontinued: true // boolean to numeric
    }; // hProduct;

  kfExpectResolution( fDone,

    hiModels.product.create( hDoc ),

    hResult => { // product created

      expect( hResult ).toHaveProperty( 'nId' );
      expect( hResult ).toHaveProperty( 'zName' );
      expect( hResult ).toHaveProperty( 'nPrice' );
      expect( hResult ).toHaveProperty( 'bDiscontinued' );
      expect( hResult.nId ).toBe( hDoc.nId );
      expect( hResult.zName ).toBe( `${nId}` );
      expect( hResult.nPrice ).toEqual( 9876.54 );
      expect( hResult.bDiscontinued ).toBe( 1 );

      hDoc.bDiscontinued = false;
      hDoc.nId = nNextProductId++;

      kfExpectResolution( fDone,

        hiModels.product.create( hDoc ),

        hResult2 => {
          expect( hResult2.bDiscontinued ).toBe( 0 );
          fDone();
          }

        ); // kfExpectResolution()

      } // product created

    ); // kExpectResolution()

  } ); // test(CastBooleanDecimalString)


//-----------------------------------------------------------------------------
//  Tests a lot of the Model code:
//    create() cals findById() which cals findOne() which cals find().
//    findByIdAndUpdate() cals findById().
//    findByIdAndRemove() cals findById() and remove().
//-----------------------------------------------------------------------------

test( 'CustomerLifeCycle', fDone => {

  const hDoc = { zName: 'Testy Testalot' };

  kfExpectResolution( fDone,

    hiModels.customer.create( hDoc ), // customer promised

    hResult => { // customer resolved

      expect( hResult ).toHaveProperty( 'nId' );
      expect( hResult ).toHaveProperty( 'zName' );
      expect( hResult[ 'zName' ] ).toBe( hDoc[ 'zName' ] );

      kfExpectResolution( fDone,

        hiModels.customer.findByIdAndUpdate(
          hResult[ 'nId' ],
          { zName: 'Testy Test-Some-More' }
          ),

        hModified => { // update resolved

          expect( hModified[ 'nId' ] ).toBe( hResult[ 'nId' ] );
          expect( hModified[ 'zName' ] ).toBe( 'Testy Test-Some-More' );

          kfExpectResolution( fDone,

            hiModels.customer.findByIdAndRemove( hModified[ 'nId' ] ),

            hRemoved => { // removed resolved

              expect( hRemoved[ 'nId' ] ).toBe( hModified[ 'nId' ] );
              expect( hRemoved[ 'zName' ] ).toBe( hModified[ 'zName' ] );

              hiModels.customer.findByIdAndRemove( hModified[ 'nId' ] ).then( // remove #2 promised

                hResult => { // remove #2 resolved
                  expect( JSON.stringify( hResult ) ).toEqual( 'to never happen' );
                  fDone();
                  },

                iErr => {
                  expect( iErr ).toBeInstanceOf( kcMysqlgoose.MysqlgooseError );
                  fDone();
                  }

                ); // remove #2 promised

              } // remove resolved

            ); // kfExpectResolution()

          } // update resolved

        ); // kfExpectResolution()

      } // customer resolved

    ); // kfExpectResolution()

} ); // test(CustomerLifeCycle)

//-----------------------------------------------------------------------------

test( 'DateTimeHandling', fDone => {

  kfExpectResolution( fDone,

    hiModels.order.findById( 1 ),

    hOrder => { // order resolved

      hOrder.dtPaid = new Date();

      kfExpectResolution( fDone,

        hiModels.order.findByIdAndUpdate( 1, hOrder ),

        hOrder2 => { // order #2 resolved

          expect( hOrder2.dtPaid.getTime() ).toBe(
            1000 * Math.round( hOrder.dtPaid.getTime() / 1000 ) );

          hOrder2.dtPaid = null;

          kfExpectResolution( fDone,

            hiModels.order.findByIdAndUpdate( 1, hOrder2 ),

            hOrder3 => { // order #3 resolved

              expect( hOrder3.dtPaid ).toBe( null );

              kfExpectRejection( fDone,
                'dtPaid must be a Date',
                hiModels.order.findByIdAndUpdate( 1,
                  { dtPaid: 'not a date' } )
                );

              } // order #3 resolved

            ); // kfExpectResolution()

         }, // order #2 resolved

        ); // kfExpectResolution()

      }, // order resolved

    ); // kfExpectResolution()

} ); // test(DateTimeHandling)

//-----------------------------------------------------------------------------

test( 'DecimalHandling', fDone => {

  kfExpectResolution( fDone,

    hiModels.product.findById( 1 ),

    hProduct => { // product resolved

      hProduct.nPrice = 1000 * Math.random();

      kfExpectResolution( fDone,

        hiModels.product.findByIdAndUpdate( 1, hProduct ),

        hProduct2 => { // product #2 resolved

          expect( sprintf( '%.2f', hProduct2.nPrice ) ).toBe(
            sprintf( '%.2f', hProduct.nPrice ) );

          hProduct2.nPrice = null;

          kfExpectResolution( fDone,

            hiModels.product.findByIdAndUpdate( 1, hProduct2 ),

            hProduct3 => { // product #3 resolved

              expect( hProduct3.nPrice ).toBe( null );

              kfExpectRejection( fDone,
                'nPrice must be numeric',
                hiModels.product.findByIdAndUpdate( 1,
                  { nPrice: 'xyz' } )
                );

              } // product #3 resolved

            ); // kfExpectResolution()

          } // product #2 resolved

        ); // kfExpectResolution()

      }, // product resolved

    ); // kfExpectResolution()

  } ); // test(DecimalHandling)

//-----------------------------------------------------------------------------

test( 'FindWithoutConditions', fDone => {

  kfExpectResolution( fDone,

    hiModels.customer.find(),

    ahResults => { // customer resolved

      expect( ahResults.length ).toBeGreaterThanOrEqual( 1 );
      expect( ahResults.map( hResult => hResult.nId ) ).toEqual(
        expect.arrayContaining( [ 1 ] ) );

      fDone();

      } // customer resolved

    ); // kExpectResolution()

  } ); // test(FindWithoutConditions)


//-----------------------------------------------------------------------------

test( 'IgnoreInheritedProps', fDone => {

  kfExpectResolution( fDone,

    Promise.all( [ 1, 2, 3 ].map( nItem =>
      hiModels.product.create( { nId: nNextProductId++, nPrice: nItem,
        zName: 'IgnoreInherited' } ) ) ),

    ahResolved => { // all product creates resolved

      expect( ahResolved ).toHaveLength( 3 );

      const hOrderBy = {};

      Object.setPrototypeOf( hOrderBy, { nPrice: 1 } );

      const hConditions = { $orderby: hOrderBy,
        zName: { $text: { $search: 'IgnoreInherited' } },
        nId: { $in: [ ahResolved[ 0 ].nId, ahResolved[ 1 ].nId ] } };

      Object.setPrototypeOf( hConditions, { nPrice: 1 } );

      kfExpectResolution( fDone,

        hiModels.product.find( hConditions ),

        ahProducts => { // products resolved

          expect( ahProducts ).toHaveLength( 2 );

          ahProducts.forEach( hProduct =>
            expect( hProduct.nId ).not.toBe( ahResolved[ 2 ] ) );

          hConditions.nPrice = 1;

          kfExpectResolution( fDone,

            hiModels.product.find( hConditions ),

            ahProducts2 => { // products resolved #2

              expect( ahProducts2 ).toHaveLength( 1 );

              expect( ahProducts2[ 0 ].nId ).toBe( ahResolved[ 0 ].nId );

              fDone();

              } // products resolved #2

            ); // kfExpectResolution();

          } // products resolved

        ); // kfExpectResolution()

      } // all product creates resolved

    ); // kfExpectResolution()

  } ); // test(IgnoreInheritedProps)

//-----------------------------------------------------------------------------

test( 'JoinAlreadyJoined', () => {

  const az1 = [ 'order', 'product' ];
  const az2 = [ 'order' ];

  const aResult = hiModels.order_product.favSqlJoin( az1, az2 );

  expect( aResult ).toHaveLength( 2 );

  expect( aResult[ 0 ] ).toMatch(
    'LEFT JOIN `product` ON `order_product`.`nProductId` = `product`.`nId`' );

  expect( aResult[ 1 ] ).toHaveLength( 1 );

  expect( aResult[ 1 ][ 0 ] ).toBe( 'product' );

  } ); // test(JoinAlreadyJoined)


  //---------------------------------------------------------------------------

test( 'MultiNestedQueries', fDone =>

  kfExpectResolution( fDone,

    hiModels.order_product.find( {
      order: { nId: 1 },
      product: { nId: 1 },
      nId: 1
      } ), // find()

    ahResult => { // order_products resolved

      expect( ahResult ).toHaveLength( 1 );

      expect( ahResult[ 0 ].nId ).toBe( 1 );
      expect( ahResult[ 0 ].order.nId ).toBe( 1 );
      expect( ahResult[ 0 ].product.nId ).toBe( 1 );

      fDone();

      } // order_products resolved

    ) // kfExpectResolution()

  ); // testMultiNestedQueries


//-----------------------------------------------------------------------------

test( 'Not', fDone => {

  kfExpectResolution( fDone,

    hiModels.customer.find( { $not: { zName: 'First Customer' } } ),

    ahCustomers => { // customers resolved

      expect( Array.isArray( ahCustomers ) ).toBe( true );
      ahCustomers.forEach( hCustomer =>
        expect( hCustomer.zName ).not.toBe( 'First Customer' ) );

      kfExpectResolution( fDone,

        hiModels.product.find( { zName: { $not: '^Primary Product$' } } ),

        ahProducts => { // products resolved

          expect( Array.isArray( ahProducts ) ).toBe( true );
          ahProducts.forEach( hProduct =>
            expect( hProduct.zName ).not.toBe( 'Primary Product' ) );

          kfExpectRejection( fDone,
            'use $ne instead of $not to test values',
            hiModels.customer.find( { nId: { $not: 1 } } )
            );

          } // products resolved

        ); // lfExpectResolution()

      } // customers resolved

    ); // kExpectResolution()

  } ); // test(Not)


//-----------------------------------------------------------------------------

test( 'NumericComparisonsAndRegex', fDone => {

  const zPrefix = 'NumCompare-' + (new Date()).getTime() + '-';

  const aiPromises = [];
  for ( let n = 0 ; n < 9 ; n++ )
    aiPromises[ n ] = hiModels.product.create(
      { nId: nNextProductId++, zName: zPrefix + n, nPrice: (1+n) } );

  kfExpectResolution( fDone,

    Promise.all( aiPromises ),

    () => { // all product creates resolved

      kfExpectResolution( fDone,

        Promise.all(
          [ '$eq', '$gt', '$gte', '$lt', '$lte', '$ne', '$in', '$nin', '$mod' ].map(
            z => hiModels.product.find( {
              $and: [
                { zName: { $regex: '^' + zPrefix + '[0-9]$' } },
                { nPrice: { [ z ] : (
                    ( '$mod' === z ) ? [ 3, 0 ] : (
                      [ '$in', '$nin' ].includes( z ) ? [ 4, 5, 6 ] : 5 )
                    ) } }
                ],
              nId: { $exists: true } // always true
              } ) // find()
            ) // map()
          ), // all

        aahResults => { // all product finds resolved

          [ 1, 4, 5, 4, 5, 8, 3, 6, 3 ].forEach(
            ( nExpect, nIndex ) =>
              expect( aahResults[ nIndex ] ).toHaveLength( nExpect )
            );

          fDone();

          } // all product finds resolved

        ); // kfExpectResolution()

      } // all product creates resolved

    ); // kfExpectResolution()

  } ); // test(NumericComparisonsAndRegex)

//-----------------------------------------------------------------------------

test( 'OrderByLimitSkipTextComment', fDone => {

  const zPrefix = 'OLSTC-' + (new Date()).getTime() + '-';

  const aiPromises = [];
  for ( let n = 0 ; n < 10 ; n++ )
    aiPromises.push( hiModels.customer.create( { zName: zPrefix + n } ) );

  kfExpectResolution( fDone,

    Promise.all( aiPromises ),

    ahCustomers => { // all customer creates resolved

      kfExpectResolution( fDone,

        Promise.all(
          ahCustomers.map( hCustomer =>
            hiModels.order.create( { nCustomerId: hCustomer.nId } )
            )
          ),

        ahOrders => { // all order creates resolved

          kfExpectResolution( fDone,

            hiModels.customer.find( {
              zName: {
                $text : { $search: zPrefix + '%', $language: 'utf8_unicode_ci' },
                $limit: 4,
                $skip: 3,
                $comment: 'nested comment'
                },
              $orderby: { zName: -1 },
              $comment: 'outer comment'
              } ),

            ahCustomers => { // customers resolved

              expect( ahCustomers ).toHaveLength( 4 );

              for ( let n = 0 ; n < 4 ; n++ )
                expect( ahCustomers[ n ].zName ).
                  toBe( zPrefix + ( 6 - n ) );

              kfExpectResolution( fDone,

                hiModels.order.find( {
                  customer: { zName: { $in:
                      ahCustomers.map( hCust => hCust.zName ) } },
                  $orderby: { customer: { zName: 1 } }
                  } ),

                ahOrders => { // orders resolved

                  expect( ahOrders ).toHaveLength( 4 );

                  let zPrev = ahOrders[ 0 ].customer.zName;

                  for ( let n = 1 ; n < 4 ; n++ ) {
                    expect( zPrev < ahOrders[ n ].customer.zName ).
                      toBe( true );
                    zPrev = ahOrders[ n ].customer.zName;
                    }

                  fDone();

                  } // orders resolved

                ); // kfExpectResolution()

              } // customers resolved

            ); // kfExpectResolution()

          } // all order creates resolved

        ); // kfExpectResolution()

      } // all customer creates resolved

    ); // kfExpectResolution()

  } ); // test(OrderByLimitSkipTextComment)


//-----------------------------------------------------------------------------

test( 'OrderByTwice1', fDone => {

  kfExpectResolution( fDone,

    hiModels.order.find( {
      nId: 1,
      $orderby: { nId: 1 },
      customer: { $orderby : { zName: 1 } }
      } ),

    ahOrders => { // orders resolved
      expect( ahOrders ).toHaveLength( 1 );
      fDone();
      }

    ); // kfExpectResolution()

  } ); // test(OrderByTwice1)


//-----------------------------------------------------------------------------

test( 'OrderByTwice2', fDone => {

  kfExpectResolution( fDone,

    hiModels.order.find( {
      customer: { $orderby : { zName: 1 } },
      nId: 1,
      $orderby: { nId: 1 }
      } ),

    ahOrders => { // orders resolved
      expect( ahOrders ).toHaveLength( 1 );
      fDone();
      }

    ); // kfExpectResolution()

  } ); // test(OrderByTwice2)


//-----------------------------------------------------------------------------

test( 'PopulateOrder', fDone => {

  const nProductId = nNextProductId++;

  kfExpectResolution( fDone,

    hiModels.customer.create( { zName: 'PopulateOrderJS' } ),

    hCustomer => { // customer resolved

      kfExpectResolution( fDone,

        hiModels.product.create(
          { nId: nProductId, zName: 'CUST #' + hCustomer.nId, nPrice: 123.45 }
          ),

        hProduct => { // product resolved

          kfExpectResolution( fDone,

            hiModels.order.create( { nCustomerId: hCustomer.nId } ),

            hOrder => { // order resolved

              const hCreateOrderProduct =
                { nOrderId: hOrder.nId, nProductId };

              kfExpectResolution( fDone,

                hiModels.order_product.create( hCreateOrderProduct ),

                hOrderProduct => { // order_product promised

                  kfExpectResolution( fDone,

                    hiModels.order_product.findOne(
                      hOrderProduct,
                      null,
                      { [ kcMysqlgoose.POPULATE ]: [ 'order', 'product', 'customer' ] }
                      ), // findOne()

                    hPopulated => { // populated resolved

                      const hExpected = Object.assign(
                        hCreateOrderProduct,
                        { order: hOrder, product: hProduct },
                        hOrderProduct
                        ); // assign()

                      fCompareOrderProducts( hPopulated, hExpected );

                      fDone();

                      } // populated resolved

                    ); // kfExpectResolution()

                  } // order_product resolved

                ); // kfExpectResolution()

              } // order resolved

            ); // kfExpectResolution()

          } // product resolved

        ); // kfExpectResolution()

      } // customer resolved

    ); // kfExpectResolution()

  } ); // test(PopulateOrder)

//-----------------------------------------------------------------------------

test( 'PopulateOrderProduct', fDone => {

  const hExpected = {
    nId: 1,
    nOrderId: 1,
    nProductId: 1,
    order: { nId: 1, nCustomerId: 1, customer: { nId: 1 } },
    product: { nId: 1 }
    }; // expected

  kfExpectResolution( fDone,

    Promise.all( [

      hiModels.order_product.findOne( hExpected ), // auto-populate

      hiModels.order_product.findById( 1, null, // explicit
        { [ kcMysqlgoose.POPULATE ]: [ 'order', 'product', 'customer' ] }
        )

      ] ), // all()

    ahActual => { // populated resolved

      ahActual.forEach(
        hActual => fCompareOrderProducts( hActual, hExpected ) );

      fDone();

      } // populated resolved

    ); // kfExpectResolution()

  } ); // test(PopulateOrderProduct)

//---------------------------------------------------------------------------

test( 'RejectAndContainsLimit', fDone =>
  fExpectRejectionForCustomers( fDone, '$and cannot contain $limit',
    { $and: [ { nId: 1 }, { $limit: 1 } ] } ) );

//---------------------------------------------------------------------------

test( 'RejectAndContainsSkip', fDone =>
  fExpectRejectionForCustomers( fDone, '$and cannot contain $skip',
    { $and: [ { nId: 1 }, { $skip: 1 } ] } ) );

//---------------------------------------------------------------------------

test( 'RejectAndContainsOrderby', fDone =>
  fExpectRejectionForCustomers( fDone, '$and cannot contain $orderby',
    { $and: [ { nId: 1 }, { $orderby: { nId: 1 } } ] } ) );

//---------------------------------------------------------------------------

test( 'RejectAndWithOneItem', fDone =>
  fExpectRejectionForCustomers( fDone, '$and array must have 2+ members',
    { $and: [ { zName: 'NotEnough' } ] } ) );

//---------------------------------------------------------------------------

test( 'RejectAndWithoutArray', fDone =>
  fExpectRejectionForCustomers( fDone, '$and must be an array',
    { $and: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectAndArrayWithoutObject', fDone =>
  fExpectRejectionForCustomers( fDone, '$and array member #0 must be an object',
    { $and: [ 1, 2 ] } ) );

//---------------------------------------------------------------------------

test( 'RejectCreateMissingId', fDone =>
  kfExpectRejection( fDone,
    'missing insert ID',
    hiModels.review.create( { nProductId: 1, zUser: 'Miss I. Dee',
      zText: 'added without ID' } )
    ) );

//---------------------------------------------------------------------------

test( 'RejectCreateMissingProductId', fDone => {

  hiModels.review.create( {
    zUser: 'Miss P. Aydee',
    zText: 'should not be added without product ID'
    } ).
      then( // promised

        vResult => { // resolved
          expect( JSON.stringify( vResult ) ).toEqual( 'to never happen' );
          fDone();
          },

        iErr => { // rejected
          expect( iErr.message ).toBe(
            "ER_NO_DEFAULT_FOR_FIELD: Field 'nProductId' doesn't have a default value" );
          fDone();
          }

        ); // promised

  } ); // test(RejectCreateMissingProductId)

//---------------------------------------------------------------------------

test( 'RejectFindByIdOnTableWithoutId', fDone =>
  kfExpectRejection( fDone, 'no primary key for review',
    hiModels.review.findById( 1 ) ) );

//---------------------------------------------------------------------------

test( 'RejectFindInScalar', fDone =>
  fExpectRejectionForCustomers( fDone, '$in requires [ value, ... ]',
    { zName: { $in: 'NotAnArray' } } ) );

//---------------------------------------------------------------------------

test( 'RejectFindNinScalar', fDone =>
  fExpectRejectionForCustomers( fDone, '$nin requires [ value, ... ]',
    { zName: { $nin: 'NotAnArray' } } ) );

//---------------------------------------------------------------------------

test( 'RejectInvalidCondition', fDone =>
  fExpectRejectionForCustomers( fDone, '$InvalidCondition is not supported',
    { $InvalidCondition: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectLimitTwice1', fDone =>
  fExpectRejectionForCustomers( fDone, '$limit can only appear once',
    { zName: { $limit: 2 }, $limit: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectLimitTwice2', fDone =>
  fExpectRejectionForCustomers( fDone, '$limit can only appear once',
    { nId: { $limit: 1 }, zName: { $limit: 2 } } ) );

//---------------------------------------------------------------------------

test( 'RejectMeta', fDone =>
  fExpectRejectionForCustomers( fDone, '$meta not supported because $text uses LIKE',
    { $meta: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectModWithExtraMembers', fDone =>
  fExpectRejectionForCustomers( fDone, '$mod requires [ divisor, remainder ]',
    { $mod: [ 5, 1, 'extra' ] } ) );

//---------------------------------------------------------------------------

test( 'RejectModWithoutArray', fDone =>
  fExpectRejectionForCustomers( fDone, '$mod requires [ divisor, remainder ]',
    { $mod: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectModWithoutRemainder', fDone =>
  fExpectRejectionForCustomers( fDone, '$mod requires [ divisor, remainder ]',
    { $mod: [ 5 ] } ) );

//---------------------------------------------------------------------------

test( 'RejectNotContainsLimit', fDone =>
  fExpectRejectionForCustomers( fDone, '$not cannot contain $limit',
    { $not: { $limit: 1 } } ) );

//---------------------------------------------------------------------------

test( 'RejectNotContainsSkip', fDone =>
  fExpectRejectionForCustomers( fDone, '$not cannot contain $skip',
    { $not: { $skip: 1 } } ) );

//---------------------------------------------------------------------------

test( 'RejectNotContainsOrderby', fDone =>
  fExpectRejectionForCustomers( fDone, '$not cannot contain $orderby',
    { $not: { $orderby: { nId: 1 } } } ) );

//-----------------------------------------------------------------------------

test( 'RejectNoUpdateSpecified', fDone => {
  kfExpectRejection( fDone,
    'no update specified',
    hiModels.order.findByIdAndUpdate( 1, {} )
    );
  } ); // test(RejectNoUpdateSpecified)

//-----------------------------------------------------------------------------

test( 'RejectNoUpdateSpecifiedIdsIgnored', fDone => {
  kfExpectRejection( fDone,
    'no update specified (IDs are ignored)',
    hiModels.order.findByIdAndUpdate( 1, { nId: 1 } )
    );
  } ); // test(RejectNoUpdateSpecified)

//---------------------------------------------------------------------------

test( 'RejectOrContainsLimit', fDone =>
  fExpectRejectionForCustomers( fDone, '$or cannot contain $limit',
    { $or: [ { nId: 1 }, { $limit: 1 } ] } ) );

//---------------------------------------------------------------------------

test( 'RejectOrContainsSkip', fDone =>
  fExpectRejectionForCustomers( fDone, '$or cannot contain $skip',
    { $or: [ { nId: 1 }, { $skip: 1 } ] } ) );

//---------------------------------------------------------------------------

test( 'RejectOrContainsOrderby', fDone =>
  fExpectRejectionForCustomers( fDone, '$or cannot contain $orderby',
    { $or: [ { nId: 1 }, { $orderby: { nId: 1 } } ] } ) );

//---------------------------------------------------------------------------

test( 'RejectOrWithOneItem', fDone =>
  fExpectRejectionForCustomers( fDone, '$or array must have 2+ members',
    { $or: [ { zName: 'NotEnough' } ] } ) );

//---------------------------------------------------------------------------

test( 'RejectOrWithoutArray', fDone =>
  fExpectRejectionForCustomers( fDone, '$or must be an array',
    { $or: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectOrArrayWithoutObject', fDone =>
  fExpectRejectionForCustomers( fDone, '$or array member #0 must be an object',
    { $or: [ 1, 2 ] } ) );

//---------------------------------------------------------------------------

test( 'RejectOrderbyFieldNotFound', fDone =>
  fExpectRejectionForCustomers( fDone,
    '$orderby field bar not found',
    { $orderby: { bar: 1 } } ) );

//---------------------------------------------------------------------------

test( 'RejectOrderbyNotHash', fDone =>
  fExpectRejectionForCustomers( fDone, '$orderby must be a hash object',
    { $orderby: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectOrderbyString', fDone =>
  fExpectRejectionForCustomers( fDone,
    '$orderby expected integer direction, found "bar"',
    { $orderby: { nId: 'bar' } } ) );

//---------------------------------------------------------------------------

test( 'RejectPopulateNotArray', fDone =>
  kfExpectRejection( fDone,
    'option POPULATE must be an array',
    hiModels.order.find( {}, null, { [ kcMysqlgoose.POPULATE ] : 'customer' } )
    ) // kfExpectRejection()
  ); // test()

//---------------------------------------------------------------------------

test( 'RejectQuery', fDone =>
  fExpectRejectionForCustomers( fDone, 'specify a query without $query',
    { $query: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectRegExpForRegex', fDone =>
  fExpectRejectionForCustomers( fDone,
    'specify $regex value as a string (without delimiters)',
    { $regex: /foo/ } ) );

//---------------------------------------------------------------------------

test( 'RejectRemoveError', fDone =>

  hiModels.product.remove( { NonExistent: 1 } ).then( // promised

    vResult => { // resolved
      expect( JSON.stringify( vResult ) ).toEqual( 'to never happen' );
      fDone();
      },

    iErr => { // rejected
      expect( iErr ).toBeInstanceOf( Error );
      expect( iErr.message ).toEqual( "unknown column: NonExistent" );
      fDone();
      }

    ) // promised

  ); // test(RejectRemoveError)

//---------------------------------------------------------------------------

test( 'RejectSkipTwice1', fDone =>
  fExpectRejectionForCustomers( fDone, '$skip can only appear once',
    { $limit: 1, $skip: 1, zName: { $skip: 1 } } ) );

//---------------------------------------------------------------------------

test( 'RejectSkipTwice2', fDone =>
  fExpectRejectionForCustomers( fDone, '$skip can only appear once',
    { $limit: 1, zName: { $skip: 1 }, $skip: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectSkipWithoutLimit', fDone =>
  fExpectRejectionForCustomers( fDone, 'cannot use $skip without $limit',
    { $skip: 1 } ) );

//---------------------------------------------------------------------------

test( 'RejectTextWithoutSearch', fDone =>
  fExpectRejectionForCustomers( fDone, '$text requires $search',
    { zName: { $text: {} } } ) );

//---------------------------------------------------------------------------

test( 'RejectTextWithCaseSensitive', fDone =>
  fExpectRejectionForCustomers( fDone,
    'use $language instead of $caseSensitive',
    { zName: { $text: { $search: 'foo%', $caseSensitive: true } } } ) );

//---------------------------------------------------------------------------

test( 'RejectTextWithDiacriticSensitive', fDone =>
  fExpectRejectionForCustomers( fDone,
    'use $language instead of $diacriticSensitive',
    { zName: { $text: { $search: 'foo%', $diacriticSensitive: true } } } ) );

//---------------------------------------------------------------------------

test( 'RejectUpdateIdWithoutOption', fDone =>
  kfExpectRejection( fDone,
    'no update specified (IDs are ignored)',
    hiModels.product.findByIdAndUpdate( 1, { nId: 1 } )
    ) );

//---------------------------------------------------------------------------

test( 'RejectUpdateInvalidColumn', fDone =>
  kfExpectRejection( fDone,
    'unknown column "foo"',
    hiModels.product.findByIdAndUpdate( 1, { foo: 1 } )
    ) );

//---------------------------------------------------------------------------

test( 'RejectUpdateMissingId', fDone =>
  kfExpectRejection( fDone,
    '0 rows updated',
    hiModels.product.findByIdAndUpdate( 0, { zName: 'IncorrectlyUpdated' } )
    ) );

//---------------------------------------------------------------------------

test( 'RejectUpdateNestedTable', fDone =>
  kfExpectRejection( fDone,
    'nested table update not supported',
    hiModels.order_product.findByIdAndUpdate( 1,
      { product: { zName: 'IncorrectlyUpdated' } } )
  ) );

//---------------------------------------------------------------------------

test( 'RejectUpdateNotSpecified', fDone =>
  kfExpectRejection( fDone,
    'no update specified',
    hiModels.product.findByIdAndUpdate( 1, {} )
    ) );

//---------------------------------------------------------------------------

test( 'RejectUpdateOnTableWithoutId', fDone =>
  kfExpectRejection( fDone, 'no primary key for review',
    hiModels.review.findByIdAndUpdate( 1, {} ) ) );

//---------------------------------------------------------------------------

test( 'RejectUpdateInvalid', fDone =>

  hiModels.order.findByIdAndUpdate( 1, { nCustomerId: 'foo' } ).
    then( // promised

      vResult => { // resolved
        expect( JSON.stringify( vResult ) ).toEqual( 'to never happen' );
        fDone();
        },

      iErr => { // rejected
        expect( iErr.message ).toBe(
          'ER_TRUNCATED_WRONG_VALUE_FOR_FIELD: Incorrect integer value: ' +
            "'foo' for column 'nCustomerId' at row 1" );
        fDone();
        }

      ) // promised

  ); // test(RejectUpdateInvalid)


// EOF
