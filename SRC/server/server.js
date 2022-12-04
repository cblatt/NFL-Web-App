const express = require("express");
const cors = require("cors");
const mysql = require("mysql");
const dbConfig = require("../config/db.config");

const app = express();

const connection = mysql.createConnection({
  host: dbConfig.HOST,
  user: dbConfig.USER,
  password: dbConfig.PASSWORD,
  database: dbConfig.DB,
});

app.use(cors());
app.use(express.json());

app.get("/message", (req, res) => {
  res.json({ message: "Hello from server!" });
});

// app.get("/login/:email", (req, res) => {
//   let email = req.params.email;
//   //let password = req.body.password;
//   let password = "password";
//   let query = `SELECT * FROM User WHERE email = "${email}" AND password="${password}"`;
//   connection.query(query, (err, data) => {
//     if (err) {
//       console.error(err);
//     }
//     console.log(data);
//     res.send(data);
//   });
// });

app.get("/current/:week", (req, res) => {
  let week = req.params.week;
  let query = `SELECT g.game_id, g.game_day, g.game_time, g.away_team, g.home_team, g.away_score, g.home_score, t.games_won AS home_wins, t.games_lost AS home_losses, t.games_tied AS home_ties,
  tt.games_won AS away_wins, tt.games_lost AS away_losses, tt.games_tied AS away_ties
  FROM (Game g JOIN Team t ON g.home_team = t.team_abbrev JOIN Team tt ON g.away_team = tt.team_abbrev) 
  WHERE g.game_id LIKE '%2022_${week}%'`;

  connection.query(query, (err, data) => {
    if (err) {
      res.status(400).send(err);
    }
    res.send(data);
  });
});

app.get("/predict/:week/:home_team", (req, res) => {
  let week = req.params.week;
  let home_team = req.params.home_team;
  let query = `SELECT g.game_id, g.game_day, g.game_time, 
  g.home_team, 
  h.points_for / (h.games_won + h.games_lost + h.games_tied) AS home_pf, 
  h.points_against / (h.games_won + h.games_lost + h.games_tied)AS home_pa,
  h.pass_yards / (h.games_won + h.games_lost + h.games_tied)AS home_passf,
  h.pass_yards_against / (h.games_won + h.games_lost + h.games_tied) AS home_passa,
  h.rush_yards / (h.games_won + h.games_lost + h.games_tied) AS home_rushf,
  h.rush_yards_against / (h.games_won + h.games_lost + h.games_tied) AS home_rusha,
  g.away_team, 
  a.points_for / (a.games_won + a.games_lost + a.games_tied) AS away_pf, 
  a.points_against / (a.games_won + a.games_lost + a.games_tied) AS away_pa,
  a.pass_yards / (a.games_won + a.games_lost + a.games_tied) AS away_passf,
  a.pass_yards_against  / (a.games_won + a.games_lost + a.games_tied)AS away_passa,
  a.rush_yards  / (a.games_won + a.games_lost + a.games_tied)AS away_rushf,
  a.rush_yards_against  / (a.games_won + a.games_lost + a.games_tied)AS away_rusha
  FROM (Game g JOIN Team h ON g.home_team = h.team_abbrev JOIN Team a ON g.away_team = a.team_abbrev) 
  WHERE g.game_id LIKE '%2022_${week}%' AND home_team LIKE '${home_team}';`;

  connection.query(query, (err, data) => {
    if (err) {
      res.status(400).send(err);
    }
    res.send(data);
  });
});

app.get("/predict/avg", (req, res) => {
  //for this to work you must have LeaugeAverages view
  let query = `SELECT * FROM LeaugeAverages`;

  connection.query(query, (err, data) => {
    if (err) {
      res.status(400).send(err);
    }
    res.send(data);
  });
});

app.get("/past/:year/:team", (req, res) => {
  let year = req.params.year;
  let team = req.params.team;
  let query = `SELECT g.game_id, g.game_day, g.game_time, g.away_team, g.home_team, g.away_score, g.home_score
  FROM Game g WHERE g.game_id LIKE '%${team}%' AND g.game_id LIKE '%${year}%' `;

  connection.query(query, (err, data) => {
    if (err) {
      res.status(400).send(err);
    }
    res.send(data);
  });
});

app.get("/roster/:t_name", (req, res) => {
  let t_name = req.params.t_name;

  let query = `SELECT pf_name, pl_name FROM (
    (SELECT team_name, pf_name, pl_name
      FROM OffensiveFootballPlayer AS offPlayer) 
        UNION
    (SELECT team_name, pf_name, pl_name 
      FROM DefensiveFootballPlayer AS defPlayer)
        UNION

        (SELECT team_name, pf_name, pl_name FROM Kicker AS kickPlayer)) AS teamRoster WHERE team_name= "${t_name}"`;
  connection.query(query, (err, data) => {
    if (err) {
      console.error(err);
    }
    console.log(data);
    res.send(data);
  });
});
app.get("/divs/:d_name", (req, res) => {
  let d_name = req.params.d_name;

  let query = `SELECT team_abbrev FROM Team WHERE div_name = "${d_name}"`;
  connection.query(query, (err, data) => {
    if (err) {
      console.error(err);
    }
    console.log(data);
    res.send(data);
  });
});

//Geting standings for whole leauge
app.get("/standings/leauge", (req, res) => {
  let query = `SELECT t.team_abbrev, d.div_name, d.conf_name, t.games_won, t.games_lost, t.games_tied 
  FROM (Team t JOIN Division d ON t.div_name = d.div_name) ORDER BY t.games_won DESC`;
  connection.query(query, (err, data) => {
    if (err) {
      res.status(400).send(err);
    }
    res.send(data);
  });
});
//Getting standing for confrence
app.get("/standings/confrence/:cnf", (req, res) => {
  let query = `SELECT t.team_abbrev, d.div_name, d.conf_name, t.games_won, t.games_lost, t.games_tied 
  FROM (Team t JOIN Division d ON t.div_name = d.div_name) WHERE d.conf_name = "${req.params.cnf}" ORDER BY t.games_won DESC`;
  connection.query(query, (err, data) => {
    if (err) {
      res.status(400).send(err);
    }
    res.send(data);
  });
});
//Getting standing for division
app.get("/standings/division/:div", (req, res) => {
  let query = `SELECT t.team_abbrev, d.div_name, d.conf_name, t.games_won, t.games_lost, t.games_tied 
  FROM (Team t JOIN Division d ON t.div_name = d.div_name) WHERE d.div_name = "${req.params.div}" ORDER BY t.games_won DESC`;
  connection.query(query, (err, data) => {
    if (err) {
      res.status(400).send(err);
    }
    res.send(data);
  });
});

app.get("/off/stats/:player", (req, res) => {
  let player = req.params.player;
  let query = `SELECT * FROM OffensiveFootballPlayer WHERE pl_name LIKE "%${player}%" OR pf_name LIKE "%${player}"`;
  connection.query(query, (err, data) => {
    if (err) {
      console.log(err);
    }
    console.log(data);
    res.send(data);
  });
});

app.get("/def/stats/:player", (req, res) => {
  let player = req.params.player;
  let query = `SELECT * FROM DefensiveFootballPlayer WHERE pl_name LIKE "%${player}%" OR pf_name LIKE "%${player}"`;
  connection.query(query, (err, data) => {
    if (err) {
      console.log(err);
    }
    console.log(data);
    res.send(data);
  });
});

app.get("/kick/stats/:player", (req, res) => {
  let player = req.params.player;
  let query = `SELECT * FROM Kicker WHERE pl_name LIKE "%${player}%" OR pf_name LIKE "%${player}"`;
  connection.query(query, (err, data) => {
    if (err) {
      console.log(err);
    }
    console.log(data);
    res.send(data);
  });
});

app.get("/team/stats/:tName", (req, res) => {
  let tName = req.params.tName;
  let query = `SELECT * FROM Team INNER JOIN TeamAbbreviation ON Team.team_abbrev =  TeamAbbreviation.team_abbrev WHERE team_name LIKE "%${tName}%" OR team_city LIKE "%${tName}%" OR Team.team_abbrev LIKE "%${tName}%"`;
  connection.query(query, (err, data) => {
    if (err) {
      console.log(err);
    }
    console.log(data);
    res.send(data);
  });
});

app.listen(8000, () => {
  console.log(`Server is running on port 8000.`);
});
