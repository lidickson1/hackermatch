const express = require("express");
const app = express();
// const bodyParser = require("body-parser");
// const MongoClient = require("mongodb").MongoClient;
// const url =
// "mongodb+srv://dickson:123@canmypeteat-he5mo.mongodb.net/test?retryWrites=true&w=majority";
let db;

app.use(express.json());

app.set("port", process.env.PORT || 3000);

app.use(express.static(__dirname), function (req, res, next) {
    res.header("Access-Control-Allow-Origin", "*");
    res.header(
        "Access-Control-Allow-Headers",
        "Origin, X-Requested-With, Content-Type, Accept"
    );
    next();
});

app.post("/connect", function (request, response) {
    connect()
        .then(() => {
            response.status(200).send("Connection successful!");
        })
        .catch((error) => {
            response.status(401).send("Connection failed!");
        });
});

app.post("/get", function (request, response) {
    getFoods(request.body)
        .then((list) => {
            response.status(200).json(list);
        })
        .catch((error) => {
            response.status(400);
        });
});

app.listen(app.get("port"));

async function connect() {
    try {
        let cluster = await MongoClient.connect(url, {
            useUnifiedTopology: true,
        });
        db = cluster.db("database").collection("food");
        return;
    } catch (error) {
        throw error;
    }
}

async function getFoods(pet) {
    let query = {};
    query["pets." + pet] = { $exists: true };
    try {
        let result = await db.find(query);
        //db find returns a cursor object, need to convert it to an array
        return result.toArray();
    } catch (error) {
        throw error;
    }
}
