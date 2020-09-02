//=============================================================================
//  Copyright 2019-2020 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

const kcMysqlgoose = require( '../index' );

module.exports = function fExpectRejection( fDone, zMessage, iPromise ) {

  iPromise.then( // promised

    vResult => { // resolved
      expect( JSON.stringify( vResult ) ).toEqual( '"to never happen"' );
      fDone();
      },

    iErr => { // rejected
      expect( iErr ).toBeInstanceOf( kcMysqlgoose.MysqlgooseError );
      if ( null !== zMessage )
        expect( iErr.message ).toEqual( zMessage );
      fDone();
      }

    ); // promised

  } // fExpectRejection

