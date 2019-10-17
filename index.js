var mongodb = require('mongodb');
var ObjectID = mongodb.ObjectID
var crypto = require('crypto');
var express = require('express');
var bodyParser = require('body-parser');


var genRandomString = function(length){
    return crypto.randomBytes(Math.ceil(length/2))
        .toString('hex')
        .slice(0,length);
}

var sha512 = function(password,salt){
    var hash = crypto.createHmac('sha512', salt);
    hash.update(password);
    var value = hash.digest('hex');
    return{
        salt: salt,
        passwordHash: value
    };
}

function saltHashPassword(userPassword){
    var salt = genRandomString(16);
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}

function checkHashPassword(userPassword, salt){
    var passwordData = sha512(userPassword, salt);
    return passwordData;
}

var app = express();
app.use(bodyParser.json);
app.use(bodyParser.urlencoded({extended: true}));

var MongoClient = mongodb.MongoClient;

var url = 'mongodb+srv://thurle1:Ravens09@quizzard-wgpu5.mongodb.net/test?retryWrites=true&w=majority'

MongoClient.connect(url, {useNewUrlParser: true}, function(err, client){
    if(err){
        console.log('unable to connect to mongo');
    } else{

        //Register

        app.post('/register', (request, response, next) => {
            var post_data = request.body;

            var plain_text_pass = post_data.password;
            var hash_data = saltHashPassword(plain_text_pass);

            var password = hash_data.passwordHash;
            var salt = hash_data.salt;

            var name = post_data.name;
            var email = post_data.email;

            var insertJSON = {
                'email': email,
                'password': password,
                'salt': salt,
                'name': name
            };

            var db = client.db('quizzard');

            //Check email exists

            db.collection('users').find({'email': email}).count(function(err, num){
                if(num != 0){
                    response.json('email already exists');
                    console.log('email already exists');
                } else{
                    //insert data
                    db.collection('users')
                    .insertOne(insertJSON, function(err, res){
                        response.json('registration success');
                        console.log('registration success'); 
                    });
                }
            });

        });
        app.get('/', function(req, res){
            res.send('Hello World');
        });
        app.post('/login', (request, response, next) => {
            var post_data = request.body;

            
            var email = post_data.email;
            var userPassword = post_data.password;


            

            var db = client.db('quizzard');

            //Check email exists

            db.collection('users').find({'email': email}).count(function(err, num){
                if(num == 0){
                    response.json('email not found');
                    console.log('email not found');
                } else{
                    //check pass
                    db.collection('users')
                        .findOne({'email': email}, function(err, user){
                            var salt = user.salt;
                            var hashPass = checkHashPassword(userPassword, salt);
                            var encryptPass = user.password;
                            if(hashPass == encryptPass){
                                response.json('login success');
                                console.log('login success');
                            } else{
                                response.json('wrong password');
                                console.log('wrong password');
                            }
                        });
                }
            });

        });

        //Start web server
        app.listen(3000, () => {
            console.log('connected to mongodb server, webservice running on port 3000');
        })
    }
})