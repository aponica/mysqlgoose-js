//=============================================================================
//  Copyright 2019-2020 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

//-----------------------------------------------------------------------------
//  Unit tests for mysqlgoose-js Schema class.
//-----------------------------------------------------------------------------

const kcSchema = require( '../lib/Schema.js' );
const kiSqlstring = require('sqlstring');

//-----------------------------------------------------------------------------

test( 'eachPath', () => {

  const hProto = { hInherited: {} };

  const hhDocDef = {
    nId: { zType: 'int', bPrimary: true },
    zName: { zType: 'varchar' }
    };

  const hhExpect = {};
  for ( let zKey in hhDocDef )
    if ( hhDocDef.hasOwnProperty( zKey ) ) {
      hhExpect[ zKey ] = Object.assign( {}, hhDocDef[ zKey ] );
      hhExpect[ zKey ].zColumnName = zKey;
      hhExpect[ zKey ].zSafeColumnName = kiSqlstring.escapeId( zKey );
      }

  Object.setPrototypeOf( hhDocDef, hProto );

  const iSchema = new kcSchema( hhDocDef );

  expect( iSchema.zIdField ).toBe( 'nId' );

  Object.setPrototypeOf( iSchema.hhColDefs, hProto );

  const hhEachResult = {};
  iSchema.eachPath( ( z, h ) => { hhEachResult[ z ] = h; } );

  expect( hhEachResult ).toMatchObject( hhExpect );
  expect( hhExpect ).toMatchObject( hhEachResult );

  for ( let hCol in hhEachResult ) {
    expect( hhEachResult[ hCol ] ).toMatchObject( hhExpect[ hCol ] );
    expect( hhExpect[ hCol ] ).toMatchObject( hhEachResult[ hCol ] );
    }

  } ); // test(eachPath)

// EOF
