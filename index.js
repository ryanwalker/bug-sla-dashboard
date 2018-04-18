const functions = require('firebase-functions');
const express = require('express')
const app = express()
const axios = require('axios')
const base64 = require('base-64')

app.set('views', './views')
app.set('view engine', 'pug')

var bugDashboard = (req, res) => {
  res.render('index.pug', { title: 'Turst', message: 'Hello Friend!' })
}





const backlogIssuesUrl = 'https://jira.infusionsoft.com/rest/agile/1.0/board/392/backlog?'
const sprintIssuesUrl = 'https://jira.infusionsoft.com/rest/agile/1.0/board/392/issue?'
const headers = {
    "content-type": "application/json",
    "authorization": "Basic cnlhbi53YWxrZXI6NzdEb2RnZXZpcGVy"
}

const sprintBugs = (sprintNumber) => {
    const jql = '&jql=sprint=' + sprintNumber + ' AND sprint = 980 AND (issuetype = Defect OR issuetype = Bug)'
    const fields = '&fields=issuetype,priority,summary,created'
    return new Promise((resolve, reject) => {
      axios({
        method: 'get',
        headers: headers,
        url: sprintIssuesUrl + jql + fields
      }).then((res) => {
        var bugs = []
        console.log('anything?')
        if (res.data && res.data.issues) {
          var issues = res.data.issues
          bugs = buildModel(issues)
        }
        resolve(bugs)
      })
    })

}

const backlog = () => {
  const jql = 'project = SGP and sprint is empty AND issuetype = Defect ORDER BY Rank ASC'

  const fields = '&fields=issuetype,priority,summary,created'
  return new Promise((resolve, reject) => {
    axios({
        method: 'get',
        headers: headers,
        url: sprintIssuesUrl + jql + fields
    }).then(
      (res) => {
        var bugs = []
        if (res.data && res.data.issues) {
            var issues = res.data.issues
            bugs = buildModel(issues)
        }
        resolve(bugs)
      }
    )
  })
}

const buildModel = (issues) => {
  var bugs = []
  for(var i = 0; i < issues.length; i++) {
    var issue = issues[i]
    bugs[i] = {
        "ticket": issue.key,
        "href": "https://jira.infusionsoft.com/browse/" + issue.key,
        "type": issue.fields.issuetype.name,
        "summary": issue.key + ': ' + issue.fields.summary,
        "priority": issue.fields.priority.name.substring(0,2),
        "created": issue.fields.created,
        "daysInQueue": daysInQueue(issue.fields.created)
    }
  }
  return bugs
}

const priorityFunction = (a, b) => {
  const aPriority = a.priority.charAt(1)
  const bPriority = b.priority.charAt(1)
  if (aPriority == bPriority) {
    return a.daysInQueue - b.daysInQueue
  } else {
    return aPriority - bPriority
  }
}

const daysInQueue = (created) => {
  const today = new Date()
  const diffInSeconds = today.getTime() - new Date(created).getTime()
  return Math.floor(diffInSeconds/(1000 * 60 * 60 * 24))
}

var response

/* GET home page. */
app.get('/', function(req, res, next) {
  response = res
  new Promise((resolve, reject) => {
    sprintBugs(980).then((result) => resolve(result))
  })
  // .then((result) => {
  //   return new Promise((resolve, reject) => {
  //     sprintBugs(947).then((bugs) => {
  //       resolve(result.concat(bugs))
  //     })
  //   })
  // })
  // .then((result) => {
  //   return new Promise((resolve, reject) => {
  //     backlog().then((bugs) => {
  //       console.log(bugs.length)
  //       resolve(result.concat(bugs))
  //     })
  //   })
  // })
  .then((result) => {
    result.sort(priorityFunction)
    response.render('index', {
      title: 'SLA Dashboard',
      bugTickets: result,
    });
  })

});


const App = (req, res) => {
  if (!req.url) {
    console.log('heh')
    req.url = '/';
    req.path = '/';
  }
  return app(req, res);
}

app.listen(3000, () => console.log('Example app listening on port 3000!'))

exports.bugDashboard = functions.https.onRequest(App);
