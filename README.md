# @aponica/mysqlgoose-js

MongoDB/MongooseJS-like interface for MySQL relational databases (and
probably MariaDB/PostgreSQL/Oracle/SQLServer/etc with some modification).

This module was created in appreciation for the abstraction provided by
MongoDB and MongoooseJS, and to access MySQL data in a consistent manner.

Because the library uses prepared statements under the covers, it also
protects against SQL injection attacks and other problems caused by malformed 
queries.

The interface is as close as possible to that provided by MongooseJS. 
Classes and methods typically have the same names, and arguments appear in 
the same order. 

**Only a subset of the features provided by MongooseJS are currently 
supported,** and not always in a fully-compatible way.  For most cases, 
however, there's enough to get by.

<a name="installation"></a>
## Installation

```sh
npm i @aponica/mongoose-js
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

### Step 2: Generate Schemas

Because MySQL table schemas are predefined in the database, the definitions
can be stored in a JSON document before your application runs, eliminating the
time needed to introspect the database every time.

To do this, run 
[@aponica/mysqlgoose-schema-js](https://aponica.com/docs/mysqlgoose-schema-js),
passing the names of the database parameters file and your desired output file
(`models.json` here):

```sh
npx @aponica/mysqlgoose-schema-js mysql.json models.json
```  

### Step 3: Create Models

In your code, create a connection to the database, then use it with your
definitions file to create the models you'll need:
 
```javascript
const fs = require( 'fs' );
const Mysqlgoose = require( '@aponica/mysqlgoose-js' );

const goose = new Mysqlgoose();
await goose.connect( JSON.parse( require('fs').readFileSync('mysql.json' ) ) );

const models = {};
const defs = JSON.parse( require('fs').readFileSync('models.json' ) );

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
//  retrieve the order row and its associated customer row.

const orders = 
  await models.order.find( { customer: { phone: '123-456-7890' } } );
```

You can also explicitly request the nested objects by specifying the desired
table names as the `Mysqlgoose.POPULATE` option:

```javascript
//  retrieve the order_product and associated order & product rows.

const ordprod = 
  await models.order_product.findById( 123, null, 
    { [ Mysqlgoose.POPULATE ]: [ 'order', 'product' ] } );
```

Unfortunately, it's not (currently) possible to populate in the other
direction. For example, it would not be possible to populate all of the
`order_product` records associated with a particular `order`, because
the `order` table would not have a foreign key suitable for finding them.


## Please Donate!

[<img src="https://aponica.com/lib/helpinghand.png"
 class=leftimg>](https://www.paypal.com/biz/fund?id=BEHTAS8WARM68)

Help keep a roof over our heads and food on our plates! 
If you find aponica™ open source software useful, please 
[click here](https://www.paypal.com/biz/fund?id=BEHTAS8WARM68) 
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

Copyright 2019-2020 Opplaud LLC and other contributors.

## License

MIT License.

## Related Links

[Online Documentation](https://aponica.com/docs/mysqlgoose-js/)
# mysqlgoose-js
