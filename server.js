var express = require("express");
var bodyParser = require("body-parser");
var mongoose = require("mongoose");
var request = require("request");
// Our scraping tools
// Axios is a promised-based http library, similar to jQuery's Ajax method
// It works on the client and on the server

var cheerio = require("cheerio");

// Require all models
var db = require("./models");

var port = process.env.PORT || 3000;

// Initialize Express
var app = express();

// Use body-parser for handling form submissions
app.use(bodyParser.urlencoded({ extended: true }));
// Use express.static to serve the public folder as a static directory
app.use(express.static("public"));

// Set mongoose to leverage built in JavaScript ES6 Promises
// Connect to the Mongo DB
mongoose.Promise = Promise;
mongoose.connect("mongodb://localhost/newstake", {
  useMongoClient: true
});

// Routes
// Route 1
// =======
// This route will retrieve all of the data
// from the scrapedData collection as a json (this will be populated
// by the data you scrape using the next route)
app.get("/scrape", function(req,res){
    
      request("https://www.nytimes.com/section/technology", function(error, response, html){
    
       // Load the HTML into cheerio and save it to a variable
      // '$' becomes a shorthand for cheerio's selector commands, much like jQuery's '$'
        var $ = cheerio.load(html);
     
        $("a.story-link").each(function(i, element) {
        // An empty array to save the data that we'll scrape
        var results = {};

            //   Save the text of the element in a "title" variable
              results.title = $(element).children().text().trim();
          
              // In the currently selected element, look at its child elements (i.e., its a-tags),
              // then save the values for any "href" attributes that the child elements may have
              results.link = $(element).attr("href").trim();

              results.summary = $(element).children().text().trim();
          
            // Log the results once you've looped through each of the elements found with cheerio
            console.log(results);
                        
            // Create a new Article using the `result` object built from scraping
                 db.Article
                 .create(results)
                 .then(function(dbArticle) {
                   // If we were able to successfully scrape and save an Article, send a message to the client
                   res.send("Scrape Complete");
                 })
                 .catch(function(err) {
                   // If an error occurred, send it to the client
                   res.json(err);
                 });

            });

        });
    });

    
    // Route for getting all Articles from the db
app.get("/articles", function(req, res) {
    // Grab every document in the Articles collection
    db.Article
      .find({})
      .then(function(dbArticle) {
        // If we were able to successfully find Articles, send them back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });


  // Route for grabbing a specific Article by id, populate it with it's note
app.get("/articles/:id", function(req, res) {
    // Using the id passed in the id parameter, prepare a query that finds the matching one in our db...
    db.Article
      .findOne({ _id: req.params.id })
      // ..and populate all of the notes associated with it
      .populate("note")
      .then(function(dbArticle) {
        // If we were able to successfully find an Article with the given id, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });



  // Route for saving/updating an Article's associated Note
app.post("/articles/:id", function(req, res) {
    // Create a new note and pass the req.body to the entry
    db.Note
      .create(req.body)
      .then(function(dbNote) {
        // If a Note was created successfully, find one Article with an `_id` equal to `req.params.id`. Update the Article to be associated with the new Note
        // { new: true } tells the query that we want it to return the updated User -- it returns the original by default
        // Since our mongoose query returns a promise, we can chain another `.then` which receives the result of the query
        return db.Article.findOneAndUpdate({ _id: req.params.id }, { note: dbNote._id }, { new: true });
      })
      .then(function(dbArticle) {
        // If we were able to successfully update an Article, send it back to the client
        res.json(dbArticle);
      })
      .catch(function(err) {
        // If an error occurred, send it to the client
        res.json(err);
      });
  });



// Start the server
app.listen(port, function() {
    console.log("App running on port " + port + "!");
  });