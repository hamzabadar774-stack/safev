# Models

This project uses direct `better-sqlite3` prepared statements inside
controllers rather than a heavyweight ORM. Table shapes are defined in
`../database/init.js`. If you want to introduce a model layer later, wrap
prepared statements in classes here (e.g. `Threat.findById`,
`Device.updateStatus`) and swap call sites — controllers already isolate
data access to a handful of files.
