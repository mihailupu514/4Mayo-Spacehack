var express = require('express')// import modulul express
var path = require('path');
var formidable = require('formidable')
var sql = require('mysql')
var crypto = require('crypto')
var nodemailer = require('nodemailer')
var fs = require('fs')
const session = require('express-session')
const http = require('http');
const socketio = require('socket.io');
const formatMessage = require('./utils/messages');

var app = express();//aici am creat serverul

app.set('view engine', 'ejs');

app.use(session({
	secret: 'abcdefg',//folosit de express session pentru criptarea id-ului de sesiune
	resave: true,
	saveUninitialized: false
  }));

app.use(express.static(path.join(__dirname, "resurse")))
app.use(express.static(path.join(__dirname, "resurse_main")))

var mysql = require('mysql');

var conexiune = mysql.createConnection({
    host:"localhost",
    user:"root",
    password:"parolasql123",
    database:"4mayo"
});

conexiune.connect(function(err){
    if (err) throw err;
    console.log("Ne-am conectat la baza de date!");
})


app.get('/users', function(req, res){
    conexiune.query("select * from users",function(err, rezultat, campuri){
        if (err) throw err;
        console.log(rezultat);
		res.render('pagini/users', {useri:rezultat});
    });
  
});

app.post("/register",function(req, res){
	var formular= formidable.IncomingForm()
	console.log("am intrat pe post");
	var conexiune=mysql.createConnection({
		host:"localhost",
		user:"root",
		password:"parolasql123",
		database:"4mayo"
	});
	
	conexiune.connect(function(err){
		if(err){
			console.log("Conexiune esuata")
		}
		else{
			console.log("Conexiune mysql cu succes")
		}
	});
	
	//nr ordine: 4
	formular.parse(req, function(err, campuriText, campuriFisier){//se executa dupa ce a fost primit formularul si parsat
		console.log("parsare")
		var eroare="";
		console.log(campuriText);
		//verificari campuri
		if(campuriText.NumePrenume==""){
			eroare+="Nume nesetat<br>";
		}

		if(campuriText.parola==""){
			eroare+="parola nesetata<br>";
		}
        var rol = campuriText.rol
        var ONG = campuriText.ONG
        console.log(campuriText.ONG)
        /*console.log(rol);
        console.log(ONG); */
        if (rol == ""){
            eroare+="Rol invalid<br>"
        }
        if (ONG == ""){
            eroare+="ONG invalid<br>"
        }
        var IdAsoc
        comanda=`SELECT id from asociatii where denumire = '${ONG}'`;
        conexiune.query(comanda, function(err, rez, campuri){
            console.log(comanda)
            IdAsoc = rez[0].id;
            //daca nu am erori procesez campurile		
        })
		if(eroare==""){
			
			var preluare =`select id from users where nume='${campuriText.nume}' and prenume='${campuriText.prenume}'`
			conexiune.query(preluare, function(err, rez, campuri){

						//daca nu am erori procesez campurile
					v = campuriText.NumePrenume.split(" ")
                    nume = v[0]
                    prenume = v[1]
					var comanda=`insert into users (nume, prenume, parola, rol, id_asociatie) values( '${nume}', '${prenume}', '${campuriText.parola}', '${rol}', ${IdAsoc} )`;
					console.log(comanda);
					conexiune.query(comanda, function(err, rez, campuri){
						if (err) {
							console.log(err);
							throw err;
						}
						res.render("pagini/loginPage");
					})			
			})
		}
		else{
		res.render("pagini/register",{err:eroare,raspuns:"Completati corect campurile"});
		}
		// verificare daca exista deja username-ul in tabelul de utilizatori
	})
    /*
	//nr ordine: 1
	formular.on("field", function(name,field){
		if(name=="username")
			if(!(field.includes('\\')||field.includes('/')))
				username=field;
			else{
				username="defaultFolder";
			}
		console.log("camp - field:", name)
	});
	
	//nr ordine: 2
	formular.on("fileBegin", function(name,campFisier){
		console.log("inceput upload: ", campFisier);
		if(campFisier && campFisier.name!=""){
			//am  fisier transmis
			var cale=__dirname+"\\poze_uploadate\\"+username
			if (!fs.existsSync(cale))
				fs.mkdirSync(cale);
			campFisier.path=cale+"\\"+campFisier.name;
			numeImagine = campFisier.name
			console.log(campFisier.path);
			//pathImagine = campFisier.path;
		}
	});
	
	//nr ordine: 3
	formular.on("file", function(name,field){
		console.log("final upload: ", name);
	}); */
});



app.post("/login",function(req, res){
	var formular= formidable.IncomingForm()
	console.log("am intrat pe login");
	
	formular.parse(req, function(err, campuriText, campuriFisier){//se executa dupa ce a fost primit formularul si parsat
		//var parolaCriptata=mysql.escape(crypto.scryptSync(campuriText.parola,parolaServer,32).toString("ascii"));
		//campuriText.username=mysql.escape(campuriText.username)
        var v = campuriText.NumePrenume.split(' ');
        nume = v[0];
        prenume  = v[1];
		var comanda=`select nume, prenume, id_asociatie, rol from users where nume='${nume}' and prenume='${prenume}' and parola='${campuriText.parola}'`;
		conexiune.query(comanda, function(err, rez, campuri){
			console.log(comanda);
			if(rez && rez.length==1){
				req.session.utilizator={
					nume:rez[0].nume,
                    prenume:rez[0].prenume,
					id_asociatie:rez[0].id_asociatie,
                    rol:rez[0].rol
				}
                var comandaAsociatie=`select denumire,logo from asociatii where id=${rez[0].id_asociatie}`;
                conexiune.query(comandaAsociatie, function(err2, rez2, campuri2){
					var comanda=`select denumire, data, locatie, status, data_sfarsit, descriere from evenimente where id_asociatie=1`;
						conexiune.query(comanda, function(err1, rez1, campuri1){
							console.log(rez1)
                    if (rez2[0].denumire){
                        res.render("pagini/" + rez2[0].denumire ,{utilizator:req.session.utilizator, evenimente:rez1});
                    }
                    else{
						res.render("pagini/ASMI",{utilizator:req.session.utilizator, evenimente:rez1}); 
					}
                         
                    })
                })
				
			}
			else{
				res.render("pagini/loginPage");
			}
		});
	});
});

app.get('/login', function (req, res) {
	res.render('pagini/loginPage');
});

app.get('/register', function (req, res) {
	res.render('pagini/register');
});

app.get('/ASMI', function (req, res) {
    var comanda=`select denumire, data, locatie, status, data_sfarsit, descriere from evenimente where id_asociatie=1`;
    conexiune.query(comanda, function(err, rez, campuri){
    res.render('pagini/ASMI',{evenimente:rez});
    })
	
});

app.get('/Best', function (req, res) {
    var comanda=`select denumire, data, locatie, status, data_sfarsit, descriere from evenimente where id_asociatie=2`;
    conexiune.query(comanda, function(err, rez, campuri){
    res.render('pagini/Best',{evenimente:rez});
    })
	
});

app.get('/OSUT', function (req, res) {
    var comanda=`select denumire, data, locatie, status, data_sfarsit, descriere from evenimente where id_asociatie=3`;
    conexiune.query(comanda, function(err, rez, campuri){
    res.render('pagini/OSUT',{evenimente:rez});
    })
	
});

app.get('/API', function (req, res) {
    comanda = "SELECT asociatii.denumire asociatie,evenimente.denumire,evenimente.data, evenimente.locatie, evenimente.status, evenimente.data_sfarsit, evenimente.descriere from evenimente join asociatii on evenimente.id_asociatie = asociatii.id;"
    /*var v = {
        
    } */
    var v = []
    conexiune.query(comanda, function(err, rez, campuri){
        for (let i=0;i<rez.length;i++){
            obj = {
                asociatie: rez[i].asociatie,
                denumire: rez[i].denumire,
                data: rez[i].data,
                locatie: rez[i].locatie,
                status: rez[i].status,
                data_sfarsit:rez[i].data_sfarsit,
                descriere:rez[i].descriere
            }
        console.log(obj)
        v.push(obj)
        }
        res.send(v);
    })
	
}); //are nevie de buton


app.get('/Admin', function (req, res) {
	var comanda=`select id, denumire, data, locatie, status, data_sfarsit, descriere from evenimente where id_asociatie=2`;
    conexiune.query(comanda, function(err, rez, campuri){
		res.render('pagini/Admin',{evenimente:rez})
	})
});

app.get('/delete/:id', function (req, res) {
	var comanda=`delete from evenimente where id=${req.params.id}`;
    conexiune.query(comanda, function(err, rez, campuri){
		res.redirect("/Admin")
	})
});

// CHAT

const {
	userJoin,
	getCurrentUser,
	userLeave,
	getRoomUsers
  } = require('./utils/users');
  
  const server = http.createServer(app);
  const io = socketio(server);
  
  // Set static folder
  app.use(express.static(path.join(__dirname, 'public')));
  
  const botName = 'Alert';
  
  // Run when client connects
  io.on('connection', socket => {
	socket.on('joinRoom', ({ username, room }) => {
	  const user = userJoin(socket.id, username, room);
  
	  socket.join(user.room);
  
	  // Welcome current user
	  // socket.emit('message', formatMessage(botName, 'Welcome to ChatCord!'));
  
	  // // Broadcast when a user connects
	  // socket.broadcast
	  //   .to(user.room)
	  //   .emit(
	  //     'message',
	  //     formatMessage(botName, `${user.username} has joined the chat`)
	  //   );
  
	  // Send users and room info
	  io.to(user.room).emit('roomUsers', {
		room: user.room,
		users: getRoomUsers(user.room)
	  });
	});
  
	// Listen for chatMessage
	socket.on('chatMessage', msg => {
	  const user = getCurrentUser(socket.id);
  
	  io.to(user.room).emit('message', formatMessage(user.username, msg));
	});
  
	// Runs when client disconnects
	socket.on('disconnect', () => {
	  const user = userLeave(socket.id);
  
	  if (user) {
		io.to(user.room).emit(
		  'message',
		  formatMessage(botName, `${user.username} a parasit chat-ul`)
		);
  
		// Send users and room info
		io.to(user.room).emit('roomUsers', {
		  room: user.room,
		  users: getRoomUsers(user.room)
		});
	  }
	});
  });
  
  const PORT = process.env.PORT || 3000;
  
  server.listen(PORT, () => console.log(`Server running on port ${PORT}`));

//SFARSIT CHAT


app.listen(8080);//serverul asculta pe portul 8080
console.log("A pornit serverul pe portul 8080");//afisez in consola un mesaj sa stiu ca nu s-a blocat