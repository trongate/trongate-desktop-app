const mariadb = require('mariadb')
const mysql_import = require('mysql-import');

function dbConnect(dbSettings) {

    return new Promise((resolve, reject) => {

        if (dbSettings.host == 'localhost') {
            dbSettings.host = '127.0.0.1'
        }

        mariadb.createConnection(dbSettings)
            .then(conn => {
              resolve(conn)
            })
            .catch(err => {
              resolve(err)
            });
    })

}

function executeQuery(query, conn) {

    return new Promise((resolve, reject) => {

        conn.query(query)
            .then(rows => {
                resolve(rows)
            })
            .catch(err => {
                conn.destroy()
                reject(err)
            })

    })

}

function extractFoundTables(rows, dbSettings) {
  return new Promise((resolve, reject) => {
    var foundTables = [];
    var targetProperty = 'Tables_in_' + dbSettings.database;

    for (var x = 0; x < rows.length; x++) {
        foundTables.push(rows[x][targetProperty])
    }

    resolve(foundTables);
  })
}



































module.exports = {

    isDbNameAvailable: async function testDbConnection(args) {

        try {

            var dbSettings = JSON.parse(args.dbSettings)
            var database = dbSettings.database
            delete dbSettings.database
            //attempt to connect to database WITHOUT database name
            var conn = await dbConnect(dbSettings)

            //must have been okay, so make sure database name is available
            var query = `SHOW DATABASES LIKE '${database}'`
            var rows = await executeQuery(query, conn)
            conn.destroy()

            if (rows.length > 0) {
                throw (`the database name ${database} is not available`)
                return
            }

            return

        } catch (err) {
            throw err
            return
        }

    },

    testDbSettings: async (dbSettings, ignoreDbName) => {

        if (typeof dbSettings !== 'object') {
            dbSettings = JSON.parse(dbSettings)
        }

        if (ignoreDbName == true) {
            delete dbSettings.database
        }

        //attempt to connect to database
        var conn = await dbConnect(dbSettings)
        conn.destroy()
        return true        
    },

    createDb: async (args) => { //create a new database

        var dbSettings = args.dbSettings

        if (typeof dbSettings !== 'object') {
            dbSettings = JSON.parse(dbSettings)
        }

        var database = dbSettings.database
        delete dbSettings.database

        //attempt to connect to database WITHOUT database name
        var conn = await dbConnect(dbSettings)

        //connection is good, now create the new database
        var query = "CREATE DATABASE IF NOT EXISTS `" + database + "`";

        await executeQuery(query, conn)
        conn.destroy()
        return true
    },

    extractDbSettings: async (fileContent) => {
        //extract the db settings from database.php, return as obj
        fileContent = fileContent.replace('//Database settings', '')
        fileContent = fileContent.replace('<?php', '')
        var myarr = fileContent.split("define('")
        var dbSettings = {}

        for (i = 1, len = myarr.length, text = ""; i < len; i++) {
            str = myarr[i]
            var targetStr = `',`
            var splitstring = str.split(targetStr)
            var thisKey = splitstring[0]
            thisKey = thisKey.toLowerCase()
            var thisValue = splitstring[1]
            thisValue = thisValue.split(/'/)[1]
            dbSettings[thisKey] = thisValue
        }

        return dbSettings
    },

    executeQuery: async(query, dbSettings) => {
        var conn = await dbConnect(dbSettings)
        var rows = await executeQuery(query, conn)
        conn.destroy()
        return rows
    },

    fetchTables: async(dbSettings) => {
        //return an array of tables 
        var query = 'SHOW TABLES';
        var conn = await dbConnect(dbSettings);
        var rows = await executeQuery(query, conn);
        conn.destroy();
        var foundTables = await extractFoundTables(rows, dbSettings);
        return foundTables;
    },

    tableExists: async (tableName, dbSettings) => {
        //return true if exists or false if not exists
        var conn = await dbConnect(dbSettings);
        var query = `show tables like "${tableName}"`;
        var rows = await executeQuery(query, conn);
        conn.destroy();
        if (rows.length>0) {
            return true;
        } else {
            return false;
        }
    },

    sqlImport: async(filePath, dbSettings) => {
        const mydb_importer = mysql_import.config(dbSettings);
        await mydb_importer.import(filePath)
        .then(() => {
            return true
        })
        .catch((err) => {
            throw err
        });
        
    },

    makeSureGotColumn: async (targetTable, targetColumn, dbSettings) => {

        var conn = await dbConnect(dbSettings)
        var query = 'describe ' + targetTable 
        var rows = await executeQuery(query, conn)
        var columnExists = false;
        
        for (var i = 0; i < rows.length; i++) {
            var row = rows[i];
            var columnName = row.Field;
            
            if (columnName == targetColumn) {
                columnExists = true;
            }

        }

        if (columnExists == false) {
            //add foreign key to the table
            var sql = 'ALTER TABLE `' + targetTable + '` ADD `' + targetColumn + '` INT NULL DEFAULT \'0\' AFTER `' + columnName + '`;'         
            await executeQuery(sql, conn)
        }

        conn.destroy()
        return true
    }

}