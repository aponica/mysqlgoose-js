//=============================================================================
//  Copyright 2019-2020 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

const kFs = require( 'fs' );
const kcMysqlgoose = require( '../lib/Mysqlgoose.js' );

let hConfig = null;
const hiModels = {};

module.exports = () => new Promise( fResolve => {

  const iGoose = new kcMysqlgoose();

  const zConfig = require('fs').readFileSync(
      'tests-config/config_mysql.json', { encoding: 'utf8' } );

  iGoose.connect( JSON.parse( zConfig ) ).then( // connection promised

    () => { // connection resolved

      const hhModelDefs = JSON.parse( kFs.readFileSync(
        'tests-config/models.json', { encoding: 'utf8' } ) );

      for ( zName in hhModelDefs )
        if ( hhModelDefs.hasOwnProperty( zName ) && ( '//' !== zName ) )
          hiModels[ zName ] =
            iGoose.model( zName, new kcMysqlgoose.Schema( hhModelDefs[ zName ] ) );

      fResolve( [ iGoose, hiModels ] );

      } // connection resolved

    ); // connection promised

  } ); // Promise()

// EOF
