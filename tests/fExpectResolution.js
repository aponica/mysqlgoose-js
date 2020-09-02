//=============================================================================
//  Copyright 2019-2020 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

module.exports = function fExpectResolution( fDone, iPromise, fResolved ) {

  iPromise.then( // promised

    fResolved,

    iErr => {
      expect( iErr.message ).toEqual( 'to never happen' );
      fDone();
      }

    ); // promised

  } // fExpectResolution

// EOF
