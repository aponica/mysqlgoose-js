//-----------------------------------------------------------------------------
//  Unit tests for mysqlgoose-js Schema class.
//-----------------------------------------------------------------------------

const kcMysqlgoose = require( '../lib/Mysqlgoose.js' );
const kcModel = require( '../lib/Model.js' );

const kfExpectRejection = require( './fExpectRejection' );
const kfExpectResolution = require( './fExpectResolution' );


//---------------------------------------------------------------------------

test( 'ExpectRejectionFails', fDone => {

  kfExpectRejection( fDone, null,
    new Promise( ( fResolve, fReject ) =>
      fResolve( 'to never happen' ) ),
    fDone
    );

  } ); // test(ExpectRejectionFails)

//---------------------------------------------------------------------------

test( 'ExpectRejectionNull', fDone => {

  kfExpectRejection( fDone, null,
    new Promise( ( fResolve, fReject ) =>
      fReject( new kcMysqlgoose.MysqlgooseError()  ) ),
    fDone
    );

  } ); // test(ExpectRejectionNull)

//---------------------------------------------------------------------------

test( 'ExpectResolutionFails', fDone => {

  kfExpectResolution( fDone,
    new Promise( ( fResolve, fReject ) =>
      fReject( new Error( 'to never happen' ) ) ),
    fDone
    );

  } ); // test(ExpectResolutionFails)

//---------------------------------------------------------------------------

test( 'InvalidConnection', fDone => {

  const iGoose = new kcMysqlgoose();

  iGoose.connect( {
    zDatabase: '', zHost: '', zPassword: '', zUser: '' }
    ).then( // connection promised

      vResult => { // connection resolved
        expect( JSON.stringify( vResult ) ).toEqual( 'to never happen' );
        fDone();
        },

      iErr => { // connection rejected
        expect( iErr ).toBeInstanceOf( Error );
        fDone();
        }

      ); // connection promised

  } ); // test(InvalidConnection)

//---------------------------------------------------------------------------

test( 'Models', fDone => {

  kfExpectResolution( fDone,

    require( './fiTestMysqlgoose' )(),

    ( [ iGoose, hiModels ] ) => { // fiTestMysqlgoose resolved

      expect( iGoose ).not.toBe( null );

      expect( hiModels.customer ).toBeInstanceOf( kcModel );

      expect( hiModels.order ).toBeInstanceOf( kcModel );

      expect( hiModels.order_product ).toBeInstanceOf( kcModel );

      expect( hiModels.product ).toBeInstanceOf( kcModel );

      fDone();

      } // fiTestMysqlgoose resolved

    ); // kfExpectResolution()

  } ); // test(Models)

//---------------------------------------------------------------------------

test( 'QueryError', fDone => {

  kfExpectResolution( fDone,

    require( './fiTestMysqlgoose' )(),

    ( [ iGoose, ] ) => { // fiTestMysqlgoose resolved

      expect( iGoose ).not.toBe( null );

      iGoose.fiQuery( null ).then( // promised

        vResult => { // resolved
          expect( JSON.stringify( vResult ) ).toEqual( 'to never happen' );
          fDone();
          },

        iErr => { // rejected
          expect( iErr ).toBeInstanceOf( Error );
          expect( iErr.message ).toEqual(
            "Cannot use 'in' operator to search for 'typeCast' in null" );
          fDone();
          }

        ); // promised

      } // fiTestMysqlgoose resolved

    ); // kfExpectResolution()

  } ); // test(QueryError)

//---------------------------------------------------------------------------

test( 'SetAndDebug', fDone => {

  kfExpectResolution( fDone,

    require( './fiTestMysqlgoose' )(),

    ( [ iGoose, ] ) => { // fiTestMysqlgoose resolved

      expect( iGoose ).not.toBe( null );

      expect( iGoose.set( 'debug', true ) ).toBe( iGoose );

      expect( () => { iGoose.debug( 'coverage test' ); } ).not.toThrow();

      const avArgs = [ 'four', 5, 'six' ];

      expect(
        iGoose.set( 'debug', ( ...avParams ) => {
          throw new Error( JSON.stringify( avParams ) );
          } )
        ).toBe( iGoose );

      expect( () => { iGoose.debug( ...avArgs ); } ).
        toThrow( JSON.stringify( avArgs ) );

      fDone();

      } // fiTestMysqlgoose resolved

    ); // kfExpectResolution()

  } ); // test(SetAndDebug)

//---------------------------------------------------------------------------

test( 'StartSession', fDone => {

  kfExpectResolution( fDone,

    require( './fiTestMysqlgoose' )(),

    ( [ iGoose, ] ) => { // fiTestMysqlgoose resolved

      expect( iGoose ).not.toBe( null );

      expect( iGoose.startSession() ).
        toBeInstanceOf( require( '../lib/Session' ) );

      fDone();

      } // fiTestMysqlgoose resolved

    ); // kfExpectResolution()

  } ); // test(StartSession)

//---------------------------------------------------------------------------

test( 'ValidConnection', fDone => {

  const iGoose = new kcMysqlgoose();

  kfExpectResolution( fDone,

    iGoose.connect(
      JSON.parse( require('fs').readFileSync(
          'tests-config/config_mysql.json', { encoding: 'utf8' } ) )
      ),

    () => { // connection resolved
      const iConn = iGoose.getConnection();
      expect( iConn.constructor.name ).toBe( 'Connection' );
      expect( iConn.state ).toBe( 'authenticated' );

      kfExpectResolution( fDone,
        iGoose.disconnect(),

        () => { // disconnect resolved

          iGoose.disconnect().then( // second disconnect promised

            vResult => {
              expect( JSON.stringify( vResult ) ).toBe( 'to never happen' );
              fDone();
              },

            iErr => {
              expect( iErr ).toBeInstanceOf( Error );
              expect( iErr.message ).
                toBe( 'Cannot enqueue Quit after invoking quit.' );
              fDone();
              }

            ); // second disconnect promised

          } // disconnect resolved

        ); // kfExpectResolution()

      } // connection resolved

    ); // kfExpectResolution()

  } ); // test(ValidConnection)

// EOF
