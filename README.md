# @aponica/mysqlgoose-js

Use [MySQL](https://www.mysql.com/) in much the same way as 
[MongoDB](https://www.mongodb.com/) and [MongooseJS](https://mongoosejs.com/).

For anyone who likes the interface to Mongo(ose) and wants to use MySQL (and 
probably other relational databases like MariaDB, PostgreSQL, Oracle or
SQLServer, with some modification) in a consistent manner. 

Easily protects against SQL injection attacks and other problems caused by 
malformed queries (by using prepared statements under the covers)!

The interface is as close as possible to that provided by MongooseJS. 
Public classes and methods typically have the same names, and arguments 
appear in the same order. 

**Only a subset of the features provided by MongooseJS are currently 
supported,** and not always in a fully-compatible way.  For most cases, 
however, there's enough to get by.

<a name="installation"></a>
## Installation

```sh
npm i @aponica/mysqlgoose-js
```

<a name="usage"></a>
## Usage

### Step 1: Specify Database Connection

Create a JSON file (we'll call it `mysql.json`) containing the 
database connection parameters as expected by:
[mysqljs/mysql](https://github.com/mysqljs/mysql):

```json
{"database":"mysqlgoose_test",
"host":"localhost",
"password":"password",
"user":"mysqlgoose_tester"}
```

### Step 2: Generate Definitions

Because MySQL table schemas are predefined in the database, the definitions
can be stored in a JSON document before your application runs, eliminating the
time needed to introspect the database every time.

To do this, run 
[@aponica/mysqlgoose-schema-js](https://aponica.com/docs/mysqlgoose-schema-js),
passing the names of the database parameters file and your desired output file
(`definitions.json` here):

```sh
npx @aponica/mysqlgoose-schema-js mysql.json definitions.json
```  

### Step 3: Create Models

In your code, create a connection to the database, then use it with your
definitions file to create the models you'll need:
 
```javascript
const fs = require( 'fs' );
const Mysqlgoose = require( '@aponica/mysqlgoose-js' );

const goose = new Mysqlgoose();
await goose.connect( JSON.parse( fs.readFileSync( 'mysql.json' ) ) );

const models = {};
const defs = JSON.parse( fs.readFileSync( 'definitions.json' ) );

for ( let [ table, def ] of Object.entries( defs ) )
  if ( '//' !== table ) // skip comment member
    models[ table ] = goose.model( table, new Mysqlgoose.Schema( def ) );
```

### Step 4: Use Models as with MongooseJS

Invoke the model methods as in MongooseJS. But keep in mind that you're 
really working with tables, not documents, so some things won't be exactly
the same!   

```javascript 
const cust = await models.customer.create( 
  { name: 'John Doe', phone: '123-456-7890' } );

const found = await models.customer.findById( cust.id );

const same = await models.customer.findOne( { phone: '123-456-7890' } );

const johns = await models.customer.find( { name: { $regex: '^John ' } } );

await models.customer.findByIdAndUpdate( cust.id, { phone: '123-456-1111' } ); 
```

### Nested Results

If a table contains a foreign key, it's possible to retrieve the referenced
table as a nested object of the current table. This happens automatically when
you use the referenced table in the filter; for example:

```javascript
//  retrieve the order rows, each with embedded customer row.

const orders = 
  await models.order.find( { customer: { phone: '123-456-7890' } } );
```

You can also explicitly request the nested objects by specifying the desired
table names as the `Mysqlgoose.POPULATE` option:

```javascript
//  retrieve the order_product with embedded order & product row.

const ordprod = 
  await models.order_product.findById( 123, null, 
    { [ Mysqlgoose.POPULATE ]: [ 'order', 'product' ] } );
```

Unfortunately, it's not (currently) possible to populate in the other
direction; for example, when you find `order` records, you can't populate
the associated `order_product` records. Hopefully, someone will add this
capability in the future!


## Please Donate!

Help keep a roof over our heads and food on our plates! 
If you find aponica® open source software useful, please 
**[click here](https://www.paypal.com/biz/fund?id=BEHTAS8WARM68)** 
to make a one-time or recurring donation via *PayPal*, credit 
or debit card. Thank you kindly!


## Unit Testing

Before running the [JEST](https://jestjs.io/) unit tests, be sure to run 
`tests-config/initialize.sql` as root in your localhost MySQL server 
(to create the user and database used by the tests).

## Contributing

Ultimately, it would be great if this module completely and faithfully 
provided all of the (possible) features of MongoDB/MongooseJS. 

Another goal is to factor out the generic functionality into a `sqlgoose-js` 
base module that could be shared with other derivatives such as 
`sqlservergoose-js` and `oraclegoose-js` modules.

Please [contact us](https://aponica.com/contact/) if you're willing to help!

Under the covers, the code is **heavily commented** and uses a form of
[Hungarian notation](https://en.wikipedia.org/wiki/Hungarian_notation) 
for data type guidance. If you submit a pull request, please try to maintain
the (admittedly unusual) coding style, which is the product of many decades
of programming experience.

## Copyright

Copyright 2019-2021 Opplaud LLC and other contributors.

## License

MIT License.

## Trademarks

OPPLAUD and aponica are registered trademarks of Opplaud LLC.

## Related Links

Official links for this project:

* [Home Page & Online Documentation](https://aponica.com/docs/mysqlgoose-js/)
* [GitHub Repository](https://github.com/aponica/mysqlgoose-js)
* [NPM Package](https://www.npmjs.com/package/@aponica/mysqlgoose-js)
  
Related projects:

* [@aponica/mysqlgoose-schema-js](https://aponica.com/docs/mysqlgoose-schema-js/)
* [@mysqljs/mysql](https://github.com/mysqljs/mysql#readme)
