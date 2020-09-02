//=============================================================================
//  Copyright 2019-2020 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================


//-----------------------------------------------------------------------------
//  @public
//
//  @alias module:@aponica/mysqlgoose-js.Session
//
//  @classdesc
//    A session is used to manage transactions.
//
//    Used like MongoDB's {@linkcode
//    https://mongodb.github.io/node-mongodb-native/3.3/api/ClientSession.html|
//    ClientSession} class.
//
//    Do **not** instantiate a `Session` directly; call {@linkcode
//    module:@aponica/mysqlgoose-js.Mysqlgoose#startSession|Mysqlgoose.startSession}
//    instead.
//
//    Only a subset of the methods provided by MongooseJS's class are
//    currently supported, and not always in a fully-compatible way.
//    For most cases, however, there's enough to get by.
//-----------------------------------------------------------------------------

class Session {

  //---------------------------------------------------------------------------
  //  @summary
  //    Constructs a session for a specified Mysqlgoose instance.
  //
  //  @description
  //    Do **not** use this constructor; call {@linkcode
  //    module:@aponica/mysqlgoose-js.Mysqlgoose#startSession|Mysqlgoose.startSession}
  //    instead.
  //
  //  @param {Mysqlgoose} iGoose
  //    The Mysqlgoose object constructing this session.
  //
  //  @see module:@aponica/mysqlgoose-js.Mysqlgoose#startSession
  //---------------------------------------------------------------------------

  constructor( iGoose ) {
    this.iGoose = iGoose;
    }

  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Aborts a transaction.
  //
  //  @returns {Promise<*>}
  //    The result of the ROLLBACK command.
  //---------------------------------------------------------------------------

  abortTransaction() {
    return this.iGoose.fiQuery( 'ROLLBACK' );
    }

  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Commits a transaction.
  //
  //  @returns {Promise<*>}
  //    The result of the COMMIT command.
  //---------------------------------------------------------------------------

  commitTransaction() {
    return this.iGoose.fiQuery( 'COMMIT' );
    }

  //---------------------------------------------------------------------------
  //  @public
  //  @async
  //
  //  @summary
  //    Starts a transaction.
  //
  //  @returns {Promise<*>}
  //    The result of the START TRANSACTION command.
  //---------------------------------------------------------------------------

  startTransaction() {
    return this.iGoose.fiQuery( 'START TRANSACTION' );
    }

  } // Session

module.exports = Session;

// EOF
