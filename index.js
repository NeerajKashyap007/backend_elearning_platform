//importing necessary modules
const express = require('express');
const path = require('path');
const cookieParser = require('cookie-parser');
const jwt = require("jsonwebtoken");
const bodyParser = require('body-parser'); 
const bcrypt = require('bcrypt');
const { Resend } = require("resend");//for handling email
const session = require('express-session');

const cloudinary = require('cloudinary').v2;//for handling user profile 

// Configuring the cloudinary
cloudinary.config({ 
  cloud_name: 'dymoznuut', 
  api_key: '672756149176645', 
  api_secret: 'NLYp-MPT3_Zj-eZJTrq6Pxy8sKg' 
});

// Create a Resend instance with API key
const resend = new Resend("re_Lq3Hjpvp_LugFkLKrus7vmj91yXGPFJnt")

//generating random code used in resetting pass
function code() {
    return Math.floor(1000 + Math.random() * 9000);
}

let verificationcode=code()
console.log(verificationcode)//for myself


//function to send email
async function sendEmail(useremail) {
  try {
    // Send email
    const { error } = await resend.emails.send({
      from: 'onboarding@resend.dev', 
      to: useremail,
      subject: 'Registration Confirmation',
      text: 'Thank you for registering!',
      html: `<p>Thank you for registering!</p>`
    });

    if (error) {
      console.error('Error sending email:', error);
      return;
    }

    console.log('Email sent successfully');
  } catch (error) {
    console.error('Error sending email:', error);
  }
}
 

//function to send email containing the unique code 

async function reset(useremail) {
    try {
      // Send email
      const {error } = await resend.emails.send({
        from: 'onboarding@resend.dev', 
        to: useremail,
        subject: 'Password Reset',
        text: 'reset your pass!',
        html: `<p>your one time pass ${verificationcode}</p>`

      });
  
      if (error) {
        console.error('Error sending email:', error);
        return;
      }
  
      console.log('reset Email sent successfully');
    } catch (error) {
      console.error('Error sending email:', error);
    }
  }

//checking the strength of password 


function isStrongPassword(password) {
    
    const minLength = 8;
    const minLowercase = 1;
    const minUppercase = 1;
    const minNumbers = 1;
    const minSpecialChars = 1;
    const specialCharsRegex = /[!@#$%^&*()_+\-=[\]{};':"\\|,.<>/?]+/;

    // Perform individual checks
    const hasMinLength = password.length >= minLength;
    const hasLowercase = /[a-z]/.test(password) && password.match(/[a-z]/g).length >= minLowercase;
    const hasUppercase = /[A-Z]/.test(password) && password.match(/[A-Z]/g).length >= minUppercase;
    const hasNumbers = /\d/.test(password) && password.match(/[0-9]/g).length >= minNumbers;
    const hasSpecialChars = specialCharsRegex.test(password) && password.match(specialCharsRegex).length >= minSpecialChars;

    // Return true if all criteria are met, otherwise false
    return hasMinLength && hasLowercase && hasUppercase && hasNumbers && hasSpecialChars;
}

//setting up database , view templete
const { Pool } = require('pg');
const { error } = require('console');
const { render } = require('ejs');
const { userInfo } = require('os');

// Create a new pool instance
const pool = new Pool({
    connectionString: 'postgresql://neondb_owner:PHO5EqBS6KWe@ep-proud-star-a55p8tew.us-east-2.aws.neon.tech/neondb?sslmode=require',
});




// start Express app
const app = express();


app.use(session({
    secret: 'secrete',
    resave: false,
    saveUninitialized: true,
    cookie: { secure: false }
}));



// Setting the view engine to EJS
app.set('view engine', 'ejs');

// Setting the directory for views and public 
app.set('views', path.join(__dirname, 'views'));
app.use(express.static(path.join(__dirname, 'public')));
app.use(cookieParser());

// Middleware to parse request bodies
app.use(bodyParser.urlencoded({ extended: true }));

//creation of the tables 

const createusertable=`
CREATE TABLE IF NOT EXISTS users (
    user_id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP

);`

const createcoursetable = `
CREATE TABLE IF NOT EXISTS courses (
    course_id SERIAL PRIMARY KEY,
    title VARCHAR(50) UNIQUE,
    description TEXT,
    category VARCHAR(50) UNIQUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);`;

const createenrollmenttable = `
CREATE TABLE IF NOT EXISTS enrollments (
    enrollment_id SERIAL PRIMARY KEY,
    user_id INT NOT NULL,
    course_id INT NOT NULL,
    enrollment_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    
);`; 


//function to execute the query for creating the table
async function createtable(){
    try{
        await pool.query(createusertable);
        await pool.query(createcoursetable);
        await pool.query(createenrollmenttable);
        console.log("tables created successfully ");
    }
    catch(error){
        console.error("error creating table",error);

    }
}

createtable();//calling the createtable function 


//inserting into courses table

const coursesData = [
    { title: 'Introduction to Programming', description: 'Learn the basics of programming with this introductory course.', category: 'Programming' },
    { title: 'Web Development Fundamentals', description: 'Explore the fundamentals of web development including HTML, CSS, and JavaScript.', category: 'Web Development' },
    { title: 'Data Science Essentials', description: 'Discover the essential concepts and techniques of data science.', category: 'Data Science' }
];

// Function to insert data into the courses table
async function insertcourses() { //read again its insertcourses
    try {
        
        for (const course of coursesData) {
            const query = {
                text: 'INSERT INTO courses (title, description, category) VALUES ($1, $2, $3)',
                values: [course.title, course.description, course.category]
            };

            await pool.query(query);
        }

        console.log('Courses inserted successfully');
    } catch (error) {
        console.error('Error inserting courses:', error);
     }
}

// Check if the courses table is empty before inserting data
async function checkCoursesData() {
    try {
        const result = await pool.query('SELECT * FROM courses');
        if (result.rows.length === 0) {
            // If the courses table is empty, insert data
            await insertcourses();
        } else {
            console.log('Courses already exist in the database');
        }
    } catch (error) {
        console.error('Error checking courses data:', error);
    }
}

// Call the function to check courses data and insert if necessary
checkCoursesData();



//routings 

app.get('/home',(req,res)=>
{
    res.render('home')// the default home page :)
})

app.post('/loginopt',(req,res)=>{

 res.render('login'); //if user clicks login then render login 

})

app.post('/regopt',(req,res)=>
{
    res.render('register')//if user is new then render register 
})


//user register
app.post('/userregister',async(req,res)=>
{
    const{name , email , password } = req.body;  //extract the name , email , password from the body
    useremail=email;//make a variable to hold the user email 
    
    
    const hashedpassword = await bcrypt.hash(password , 10);//hash the password :)
    try{ //check the strenght of password
        if (!isStrongPassword(password)) {
            return res.status(400).send('Password shuld contain lowercase,uppercase,numbers and special characaters ');
        }
        const resultss= await pool.query('SELECT email FROM users WHERE email=$1',[email])
        if (resultss.rows.length == 1) {//check if rows lenght is 1 then user exist
            console.log("User already exists");
            return res.status(400).send('User already exists');
        }
        await sendEmail(useremail)//send the confirmation email using the variable we decalred
        await pool.query('INSERT INTO users(name, email, password) VALUES($1,$2,$3)', values=[name,email,hashedpassword]);
        console.log("user entered successfully ")
        res.render("login") //after user is registred render the login page :)
    }
    catch(error){
        console.error("error inserting into user ",error)
        res.render('register')
    }
})

//authentication

app.post('/userregister',(req,res)=>
{
    res.redirect('/loginopt');//redirect to loginopt
})


app.post('/userlogin', async (req, res) => {
    const { email, password } = req.body; //extract the email and password from body
    try {
        const result = await pool.query('SELECT * FROM users WHERE email = $1', [email]);
        const user = result.rows[0]; //select the first row 

        if (!user) { //if tht user dosnt exist then render again login page
            console.log("User doesn't exist");
            return res.render('login', { error: 'Invalid username or password' });
        }

        const isPasswordMatch = await bcrypt.compare(password, user.password); //check the passowrd 
        if (!isPasswordMatch) {
            console.log("Invalid password");
            return res.render('login', { error: 'Invalid username or password' });
        }


        const newToken = jwt.sign({ userId: user.user_id }, "secrete");//assign the token 
        res.cookie('token', newToken, { maxAge: 3600000 });//configure the token
        
        res.redirect('/'); //redirect to / for checking if token exist
    } catch (error) {
        console.error("Error faced:", error);
        res.status(500).send('An error occurred');
    }
});




app.get('/',async(req,res)=>
{
    const token = req.cookies.token; //extract the token from cookie
    if(token){//if token exist then render logout page
        res.render('logout')
    }
    else{
        res.render('login')
    }
})

//ending the session 
app.post('/check', (req, res) => {
    res.clearCookie('token');
    res.render('login')//this is from ejs if the user click the logout button it will redirect to check and will clear the cookie and then rener login page
});


//resetting password

app.post('/resetpass',(req,res)=>
{
    res.render('reset1'); //render the rest1
})

app.post('/checkemail',async (req,res)=>
{
    const{email}=req.body; //extract the user email
    await reset(email); //send the 4 digit code
    res.redirect('/checkcode') //redirect to check code
})

app.get('/checkcode',async(req,res)=>
{
    res.render('code'); //render the page to enter the code
})

app.post('/done',(req,res)=>
{
    const{vc}=req.body;
    if(vc==verificationcode){ //check if the code matches or not 
        res.render('reset2') //if yes render the page where user will enter the new password
    }
    else{
        res.status(400).send("one time password dosent match ")
    }
})

app.post('/resetnow', async (req, res) => {
    try {
        
        const { email, pass2 } = req.body;//extracting the email and pass2

        
        if (!pass2) {
            return res.status(400).send('New password is required'); //if user submit empty form then throw error
        }

        if (!isStrongPassword(pass2)) {
            return res.status(400).send('Password does not meet strength criteria');//if user password is weak then throw error
        }

        
        const hashedPassword = await bcrypt.hash(pass2, 10); //has the new password

        
        const query = {
            text: 'UPDATE users SET password = $1 WHERE email = $2',
            values: [hashedPassword, email],//update the database
        };
        await pool.query(query);

        
        res.status(200).send('Password updated successfully');
        
    } catch (error) {
        
        console.error('Error updating password:', error);
        res.status(500).send('An error occurred while updating password');
    }
});


//admin login 

app.get('/admin',(req,res)=>
{
    res.render('adminlogin')//this is for super admin 
})

app.post('/adminlogin',(req,res)=>
{
    const{adminemail}=req.body;
    if(adminemail==="kashyapneeraj001@gmail.com"){ //strictly check if the admin username matches
        res.render('adminchange')//if yes display the admin change page
    }
    else{
        res.status(500).send("you are not admin ");
    }
})



//admin add , del course 


//admin choos to add new course 
app.post('/newcourse',(req,res)=>
{
    res.render('adminadd');//admin will redirect here if he clicks new course button
})

//admin adding the new course

app.post('/newcourseadded',async(req,res)=>
{
    const{tittle,desc,category}=req.body;
    try {
        //ectract the tittle ,description, category from the page and add a new course 
        const query = {
            text: 'INSERT INTO courses (title, description, category) VALUES ($1, $2, $3)',
            values: [tittle, desc, category]
        };
        await pool.query(query);

        
        res.status(200).send('Course added successfully');
        res.redirect('/redirectadd')
    } catch (error) {
       
        console.error('Error adding course:', error);
        res.status(500).send('An error occurred while adding the course');
    }
    
})


//admin selecting del
app.post('/delcourse',(req,res)=>
{
    res.render('admindel')
})

//admin deleting the course of his own choice

app.post('/deletedcourse',async(req,res)=>
{
    const{cid}=req.body;//extract the course id from the body
    try{
        const query={
            text:'DELETE FROM COURSES WHERE course_id = $1',
            values:[cid]//delete the course using course id i.e. cid
        };
        await pool.query(query);
        console.log("courses deleted successfully ")
        res.redirect('/redirectdel')
        
    }catch(error){
        console.error("cannot delte the course");
        res.status(400).send('cannot delete ');
        
    }
})
//redirecting after adding and delteting
app.get('/redirectdel',(req,res)=>
{
    res.render('admindel')
})

app.get('/redirectadd',(req,res)=>
{
    res.render('adminadd')
})


//enrolling into the course 

app.post('/enroll', async (req, res) => {
    const { email, course_id } = req.body; //extract email and course id from body

    try {
        // Check if the user exists
        const userResult = await pool.query('SELECT user_id FROM users WHERE email = $1', [email]);//select the user_id using email
        if (userResult.rows.length === 0) {//if rows lenght is 0 then no user found 
            return res.status(400).send('User not found');
        }
        const userId = userResult.rows[0].user_id;// if condition didnt execute then user is present 
        //select the first row 
       
        const enrollmentCheckResult = await pool.query('SELECT * FROM enrollments WHERE user_id = $1 AND course_id = $2', [userId, course_id]);
        if (enrollmentCheckResult.rows.length > 0) {//check if user is already enrolledor not 
            return res.status(400).send('User is already enrolled in this course');
        }

       
        await pool.query('INSERT INTO enrollments (user_id, course_id) VALUES ($1, $2)', [userId, course_id]);//if not then enroll the user 

        res.status(200).send('Enrollment successful');
    } catch (error) {
        console.error('Error enrolling user:', error);
        res.status(500).send('An error occurred while enrolling user');
    }
});


// Route handler for fetching user information
app.get('/userinfo', async (req, res) => {
    try {
        // Extract userId from the JWT token in the cookie
        const token = req.cookies.token;
        console.log(token)
        if (!token) {
            return res.status(401).send('User not authenticated');
        }
        const decodedToken = jwt.verify(token, 'secrete'); //decode the token
        const userId = decodedToken.userId;
        const defaultProfilePicUrl ='https://res.cloudinary.com/dymoznuut/image/upload/v1712511621/cld-sample-2.jpg' //using cloudnary default pic for user id 
        // Fetch user information using userId
        const userQuery = await pool.query('SELECT name, email FROM users WHERE user_id = $1', [userId]);
        const user = userQuery.rows[0];

        // Fetch enrolled courses
        const enrollmentsQuery = await pool.query('SELECT courses.title FROM enrollments JOIN courses ON enrollments.course_id = courses.course_id WHERE user_id = $1', [userId]);//here we use join operation it joins 
        //joins the two table togeater the coloumn name must be same.
        const courses = enrollmentsQuery.rows;

        // Render user information page with user and courses data
        res.render('userinformation', { user, courses,profilePicUrl: defaultProfilePicUrl });
    } catch (error) {
        console.error("Error:", error);
        res.status(500).send('An error occurred while fetching user information');
    }
});


// starting the server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
