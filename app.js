const express = require("express");
const app = express();
const mongoose = require("mongoose");
const Listing = require("./models/listing.js");
const path = require("path");
const methodOverride = require("method-override");
const ejsMate = require("ejs-mate");
const wrapAsync = require("./utils/wrapAsync.js");
const ExpressError = require("./utils/ExpressError.js");
const {listingSchema, reviewSchema} = require("./schema.js");
const Review = require("./models/review.js");


const MONGO_URL = "mongodb://127.0.0.1:27017/wanderlust";

main().then(() => {
    console.log("connected to DB");
}).catch((err) => {
    console.log(err);
});

async function main() {
    await mongoose.connect(MONGO_URL);
}

app.set("view engine", "ejs");
app.set("views", path.join(__dirname,"views"));
app.use(express.urlencoded({extended: true}));
app.use(methodOverride("_method"));
app.engine('ejs', ejsMate);
app.use(express.static(path.join(__dirname, "/public")));


app.get("/", (req,res)=>{
    res.send("Hii I am root");
});

const validateReview = (req,res,next)=>{
    let {error} = reviewSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else {
        next();
    }
};

const validateListing = (req,res,next)=>{
    let {error} = listingSchema.validate(req.body);
    if(error){
        let errMsg = error.details.map((el)=>el.message).join(",");
        throw new ExpressError(400, errMsg);
    }else {
        next();
    }
};

//Index route
app.get("/listings", wrapAsync(async (req,res)=>{
    const allListings = await Listing.find({});
    res.render("./listings/index.ejs", {allListings});
}));

//new route
app.get("/listings/new", (req,res)=>{
    res.render("./listings/new.ejs");
});

// create route
app.post("/listings", validateListing, wrapAsync(async (req,res,next)=>{
        const newListing = new Listing(req.body.listing);
        await newListing.save();
        res.redirect("/listings");
}));

//Update Route
app.put("/listings/:id", wrapAsync(async (req,res)=>{
    let {id} = req.params;
    let updatedValue = await Listing.findByIdAndUpdate(id, {...req.body.listing});
    console.log(updatedValue);
    res.redirect("/listings");
}));

//Show Route
app.get("/listing/:id", wrapAsync(async (req,res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id).populate("reviews");
    res.render("./listings/show.ejs",{listing});
}));

//Edit Route
app.get("/listings/:id/edit", wrapAsync(async (req,res)=>{
    let {id} = req.params;
    const listing = await Listing.findById(id);
    res.render("./listings/edit.ejs", {listing});
}));

app.delete("/listings/:id", wrapAsync(async (req,res)=>{
    let {id} = req.params;
    let deletedListing = await Listing.findByIdAndDelete(id);
    console.log(deletedListing);
    res.redirect("/listings");
}));

//Reviews
//Post review Route
app.post("/listings/:id/reviews", validateReview, wrapAsync(async (req,res)=> {
    let listing = await Listing.findById(req.params.id);
    let newReview = new Review(req.body.review);
    listing.reviews.push(newReview);
    await newReview.save();
    await listing.save();

    res.redirect(`/listings/${listing._id}`);
}));

//Delete Review Route
app.delete("/listings/:id/reviews/:reviewId", wrapAsync(async (req,res)=>{
    let {id,reviewId} = req.params;
    await Review.findById(reviewId);
}));

// app.get("/testListing", async (req,res)=>{
//     let sampleListing = Listing({
//         title: "My New Villa",
//         description: "By the beach",
//         price: 1200,
//         location: "Calangute, Goa",
//         country: "India",
//     });

//     await sampleListing.save();
//     console.log("sample was saved");
//     res.send("successful testing");
// });

app.all("*", (req,res,next)=> {
    next(new ExpressError(404, "page not found!"));
})
app.use((err,req,res,next)=>{
    let {statusCode, message} = err;
    res.render("error.ejs",{message});
    //res.status(statusCode).send(message);
});

app.listen(3000, ()=> {
    console.log("server is listening to port 3000");
});