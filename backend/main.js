const express = require('express')
const cors = require('cors')
const multer = require('multer')
const fs = require('fs')
const DB = require('./dbconnect')

const exposedPort = 8080
const app = express()
const db = new DB()
const date = new Date()
var uploadDir = 'uploads/'+date.getFullYear()+'/'+(date.getMonth()+1)+'/'+date.getDate()+'/'

console.log(uploadDir)

/*
*	Main backend component that acts as an API server
*   Reachable on the exposed port, 8080 by default. This module uses node.js 
*	as an environment and ExpressJs as the framework for the API. It connects
*	to an SQLite database in a different container, the database connection and 
*	further logic is dealt with in another module.
*
*	The endpoints' descriptions are above their respective router functions. The
*	cookbook's user can create/query/delete recipes based on search params.
*/

const createDirIfNotExists = () => {
	const dir = 'uploads/'+date.getFullYear()+'/'+(date.getMonth()+1)+'/'+date.getDate()+'/'
	if (!fs.existsSync('./public/'+dir)) {
	  fs.mkdirSync('./public/'+dir, { recursive: true })
	  uploadDir = dir
	}
};

// Set up storage configuration for Multer
const storage = multer.diskStorage({
	destination: (req, file, cb) => {
	  createDirIfNotExists()
	  cb(null, './public/'+uploadDir) // Define the destination folder for uploaded files
	},
	filename: (req, file, cb) => {
	  cb(null, Date.now() + '-' + file.originalname) // Define the file name format
	}
});

const upload = multer({ storage: storage });

// adding the json parser and cors middleware to the application, used for parsing the request body
app.use(express.json())
app.use(cors()) 
// setting the folder for static file serving, accessing the images
app.use(express.static('public'))

app.get('/', upload.none(), (req, res) => {
	res.send("Silence is golden")
})

// getting recipe(s) based on search parameters provided
app.post('/api/recipe/get', upload.none(), async (req, res) => {
	const searchDetails = req.body

	const recipes = await db.getAll(searchDetails['query'])
	
	res.json(recipes)
})

// getting a recipe by its id
app.get('/api/recipe/get/:recipeId', upload.none(), async (req, res) => {
	const recipeID = req.params['recipeId']
	const recipe = await db.getFirst("SELECT * FROM recipes WHERE id="+recipeID)
	
	console.log(recipe)

	res.json(recipe)
})

// creating a new recipe
app.post('/api/recipe/create', upload.none(), async (req, res) => {
	const details = req.body
	const ingredients_string = details['ingredients_array'].map(i => i.text).join(",")

	console.log(details)

	const result = await db.insertRecipe(details['title'], ingredients_string, details['description'], details['notes'], details['image_path'], 0)

	res.json(result)
})

// editing a recipe
app.post('/api/recipe/edit', upload.none(), async (req, res) => {
	const details = req.body
	const ingredients_string = details['ingredients_array'].map(i => i.text).join(",")
	const recipeID = details['id']

	console.log(details)

	const result = await db.editRecipe(details['title'], ingredients_string, details['description'], details['notes'], details['image_path'], details['liked'], recipeID)

	res.json(result)
})

// deleting a recipe by its id
app.delete('/api/recipe/delete/:recipeId', upload.none(), async (req, res) => {
	const recipeID = req.params['recipeId']

	const result = await db.deleteRecipes([recipeID])

	res.json(result)
})

// uploading an image for a recipe with the help of multer
app.post('/api/upload', upload.single('file'), async (req, res) => {
	res.json({"path":uploadDir+req.file.filename})
})

// deleting an image by its path
app.post('/api/files/delete', upload.none(), async (req, res) => {
	const filePath = req.body['image_path']

	if (!filePath) {
		return res.json({"message":"ok"})
	}

	console.log(filePath);

	fs.unlink('./public/'+filePath, function(err) {
		if(err && err.code == 'ENOENT') {
			console.info("File doesn't exist.")
			return res.json({"message":"error"})
		} else if (err) {
			console.error("Error occurred while trying to remove file")
			return res.json({"message":err.message})
		} else {
			console.info(`removed`)
			return res.json({"message":"ok"})
		}
	})
})

//running the app
app.listen(exposedPort, '0.0.0.0', () => {
	console.log("Server running on port "+exposedPort)
})