//=============================================================================
//  Copyright 2019-2021 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

//-----------------------------------------------------------------------------
//  Unit tests for mysqlgoose-js Session class.
//-----------------------------------------------------------------------------

const kfExpectResolution = require( './fExpectResolution' );

const kcMysqlgoose = require( '../lib/Mysqlgoose.js' );
const kcSession = require( '../lib/Session.js' );

//-----------------------------------------------------------------------------

const faCreateTransaction = bValid =>  new Promise( fResolveMain => {

  const hRetVal = {
    zCustomerName: 'Session Test ' + ( bValid ? 'COMMIT' : 'ABORT' ),
    nId: null,
    hiModels: null,
    ahOrderProduct: []
    }; // hRetVal

  const fResolveWithRetVal = () => {
    fResolveMain( hRetVal );
    };

  const fResolveRejection = iErr => {
    //console.error( iErr );
    fResolveWithRetVal();
    };

  require( './fiTestMysqlgoose' )().then(

    ( [ iGoose, hiModels ] ) => { // fiTestMysqlgoose resolved

      hRetVal.hiModels = hiModels;

      const iSession = new kcSession( iGoose );

      const fAbort = iErr => {
        //console.error( iErr );
        iSession.abortTransaction().then(
          fResolveRejection,
          fResolveRejection
          );
        }; // fAbort

      iSession.startTransaction().then( // transaction promised
        () => { // transaction resolved
          hiModels.customer.create( { zName: hRetVal.zCustomerName } ).then( // customer promised
            hCust => { // customer resolved
              hRetVal.nId = hCust.nId;
              hRetVal.zProductName = 'Session Customer ' + hCust.nId;
              hiModels.product.create(
                { nId: hRetVal.nId, zName: hRetVal.zProductName,
                  nPrice: 9999 * Math.random() }
                ).then( // product promised
                  hProduct => { // product resolved
                    hiModels.order.create( { nCustomerId: hCust.nId } ).then( // order promised
                      hOrder => { // order resolved
                        const hOrderProduct = { nOrderId: hOrder.nId };
                        if ( bValid )
                          hOrderProduct.nProductId = hProduct.nId;
                        hiModels.order_product.create( hOrderProduct ). then( // order_product promised
                          () => { // order_product resolved
                            iSession.commitTransaction().then( // commit promised
                              () => {  // commit resolved
                                hiModels.order_product.find(
                                { nProductId: hProduct.nId },
                                null,
                                { [ kcMysqlgoose.POPULATE ]: [ 'product', 'order', 'customer' ] }
                                ). // find()
                                  then( // populate promised
                                    ahOrderProduct => {
                                      hRetVal.ahOrderProduct = ahOrderProduct;
                                      fResolveWithRetVal();
                                      },
                                    fResolveRejection
                                    ); // populate promised
                                }, // commit resolved
                              fAbort // commit rejected
                              ); // commit promised
                            }, // order_product resolved
                          fAbort // order_product rejected
                          ); // order_product promised
                        }, // order resolved
                      fAbort // order rejected
                      ); // order promised
                  }, // product resolved
                fResolveRejection // product rejected
                ); // product promised
              }, // customer resolved
            fAbort // customer rejected
            ); // customer promised
          }, // transaction resolved
        fAbort // transaction rejected
        ); // transaction promised


      }, // fiTestMysqlgoose resolved

    fResolveRejection // fiTestMysqlgoose rejected

    ); // fiTestMysqlgoose promised

  } ); // Promise()


//---------------------------------------------------------------------------

test( 'commit', fDone => {

  kfExpectResolution( fDone,

    faCreateTransaction( true ),

    hResults => { // addition resolved

      expect( hResults.ahOrderProduct.length ).toBe( 1 );

      const hOrderProduct = hResults.ahOrderProduct[ 0 ];

      expect( hOrderProduct ).toHaveProperty( 'product' );

      expect( hOrderProduct.product.nId ).toBe( hResults.nId );

      expect( hOrderProduct.product.zName ).toBe( hResults.zProductName );

      expect( hOrderProduct ).toHaveProperty( 'order' );

      expect( hOrderProduct.order ).toHaveProperty( 'customer' );

      expect( hOrderProduct.order.customer.nId ).toBe( hResults.nId );

      expect( hOrderProduct.order.customer.zName ).toBe( hResults.zCustomerName );

      fDone();

      } // addition resolved

    ); // kfExpectResolution()

  } ); // test(commit)

//---------------------------------------------------------------------------

test( 'rollback', fDone => {

  kfExpectResolution( fDone,

    faCreateTransaction( false ),

    hResults => { // addition resolved

      expect( hResults.ahOrderProduct.length ).toBe( 0 );

      kfExpectResolution( fDone,

        hResults.hiModels.product.find( { zName: hResults.zProductName } ),

        ahProducts => { // products resolved

          expect( ahProducts.length ).toBe( 0 );

          kfExpectResolution( fDone,

            hResults.hiModels.customer.
              find( { zName: hResults.zCustomerName } ),

            ahCusts => { // customers resolved

              expect( ahCusts.length ).toBe( 0 );

              kfExpectResolution( fDone,

                hResults.hiModels.order.find( { nCustomerId: hResults.nId } ),

                ahOrders => { // orders resolved

                  expect( ahOrders.length ).toBe( 0 );

                  kfExpectResolution( fDone,

                    hResults.hiModels.order_product.
                      find( { nProductId: hResults.nId } ),

                    ahOrderProducts => { // order_products resolved
                      expect( ahOrderProducts.length ).toBe( 0 );
                      fDone();
                      }

                    ); // kfExpectResolution()

                  }, // orders resolved

                ); // kfExpectResolution()

              } // customers resolved

            ); // kfExpectResolution()

          } // products resolved

        ); // kfExpectResolution()

      } // addition resolved

    ); // kfExpectResolution()

  } ); // test(rollback)

// EOF


