//=============================================================================
//  Copyright 2019-2021 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

//-----------------------------------------------------------------------------
//  @alias module:@aponica/mysqlgoose-js.MysqlgooseError
//  @public
//
//  @classdesc
//    Error class for Mysqlgoose errors.
//
//    Note that errors raised by dependencies (such as
//    [mysqljs/mysql]{@link https://github.com/mysqljs/mysql|mysqljs/mysql})
//    will *not* be instances of this class.
//
//  @summary
//    Constructs a Mysqlgoose error.
//
//  @extends Error
//-----------------------------------------------------------------------------

class MysqlgooseError extends Error {

  constructor( ...avArgs ) {
    super( ...avArgs );
    }
  }

module.exports = MysqlgooseError;

// EOF
