//=============================================================================
//  Copyright 2019-2021 Opplaud LLC and other contributors. MIT licensed.
//=============================================================================

//-----------------------------------------------------------------------------
//  @module @aponica/mysqlgoose-js
//  @public
//
//  @summary
//    MongoDB/MongooseJS-like interface for MySQL relational databases (and
//    probably MariaDB/Oracle/PostgreSQL/SQLServer/etc with some modification).
//
//  @description
//    MongoDB/MongooseJS-like interface for MySQL relational databases (and
//    probably MariaDB/Oracle/PostgreSQL/SQLServer/etc with some modification).
//
//    The interface is as close as possible to that provided by MongooseJS.
//    Classes and methods typically have the same names, and arguments appear
//    in the same order. That said, to date, only a small (but generally
//    sufficient) subset of MongooseJS features has been completed.
//
//  @see https://mongoosejs.com/
//  @see https://aponica.com/docs/mysqlgoose-schema-js/
//-----------------------------------------------------------------------------

module.exports = require( './lib/Mysqlgoose.js' );

// EOF
