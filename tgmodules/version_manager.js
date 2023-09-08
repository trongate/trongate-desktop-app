const path = require('path')
const os = require("os")
const { app, BrowserWindow, Tray, Menu, ipcMain, shell, dialog, nativeImage } = require('electron')
const configDir =  app.getPath('userData')
const assetsDir = configDir + path.sep + 'assets'
const ignoreDeclarationDir = configDir + path.sep + 'ignore_version_requests'
const ignoreFilePath = ignoreDeclarationDir + path.sep + 'info.json'
const file_manager = require("./file_manager.js")
const request_manager = require("./request_manager.js")

function removeOldRecords(fileContent) {
    //returns new content
    return new Promise((resolve, reject) => {

        var date = new Date()
        var nowtime = date.getTime()
        var newRows = []
        var rows = JSON.parse(fileContent)

        for (var i = 0; i < rows.length; i++) {
            var expiryDate = rows[i]['expiryDate']
            if (expiryDate>nowtime) {
                newRows.push(rows[i])
            }
        }

        var newFileContent = JSON.stringify(newRows)     
        resolve(newFileContent)
    })

}

function isIgnoreSet(fileContent, localFrameworkPath) {
    return new Promise((resolve, reject) => {

        if (fileContent == '') {
            resolve(false)
        } else {

            var rows = JSON.parse(fileContent)

            for (var i = 0; i < rows.length; i++) {
                var localFramework = rows[i]['localFramework']

                if (localFramework == localFrameworkPath) {
                    resolve(true)
                }
            }

        }

        resolve(false)

    })    
}

function getLocalFrameworkVersion(licenseContents) {

    return new Promise((resolve, reject) => {

            var pos = licenseContents.search("Version:")
            var start = pos + 9 //allow for the word Version: 
            var end = start+30
            var localFrameworkVersion = licenseContents.substring(start, end)

    var newLine = `
`;
            var firstAsteriskPos = localFrameworkVersion.search(newLine)
            localFrameworkVersion = localFrameworkVersion.substring(0, firstAsteriskPos)
            resolve(localFrameworkVersion)


    })

}



















module.exports = {

    initCheckForMismatch: async (selectedDir, apiUrl) => {

        //start this one off by making sure we have an 'ignore' file
        var directoryExists = await file_manager.doesThisExist(ignoreDeclarationDir).catch((err) => {
            throw err
        })    

        if (directoryExists == false) {
            await file_manager.makeADirectory(ignoreDeclarationDir).catch((err) => {
                throw err
            })
        }

        var fileExists = await file_manager.doesThisExist(ignoreFilePath).catch((err) => {
            throw err
        })

        if (fileExists == false) {
            await file_manager.upsertFile(ignoreFilePath, '').catch((err) => {
                throw err
            })
        }

        //ignore file established - check to see if current version to be ignored
        var fileContent = await file_manager.readTheFile(ignoreFilePath).catch((err) => {
            throw err
        })

        //remove old records from the file
        if (fileContent !== '') {
            var newFileContent = await removeOldRecords(fileContent)
        } else {
            var newFileContent = fileContent
        }

        if (newFileContent !== fileContent) {

            await file_manager.upsertFile(ignoreFilePath, newFileContent).catch((err) => {
                throw err
            })

            fileContent = newFileContent
        }

        var localFrameworkPath = selectedDir;
        var result = await isIgnoreSet(fileContent, localFrameworkPath)

        if (result == true) { //this version should be ignored
            return
        } else {
            //read the license from the engine
            var licenseFilePath = localFrameworkPath + path.sep + 'engine' + path.sep + 'license.txt'

            var licenseContents = await file_manager.readTheFile(licenseFilePath).catch((err) => {
                throw err;
            })

            var localFrameworkVersion = await getLocalFrameworkVersion(licenseContents)

            var targetUrl = apiUrl + '/get_current_version';
            var currentFrameworkVersion = await request_manager.submitGetRequest(targetUrl, false).catch((err) => {
                throw err;
            })

            if (localFrameworkVersion !== currentFrameworkVersion) {

                var params = {
                    errorType: 'versionMismatch',
                    localFrameworkVersion,
                    currentFrameworkVersion,
                    localFrameworkPath
                }

                return params;
            } else {
                return selectedDir;
            }

        }
        
    },

    registerIgnoreCurrentVersion: async (args) => {

        var localFrameworkPath = args.localFrameworkPath
        var date = new Date()
        var expiryDate = date.getTime() + (86400000*21)

        //fetch all of the data from the ignore (new version) file
        var fileContent = await file_manager.readTheFile(ignoreFilePath).catch((err) => {
            throw err;
        })

        //convert the file fileContent into rows
        if (fileContent == '') {
            var rows = []
        } else {
            var rows = JSON.parse(fileContent)
        }

        //add new row onto the file
        var newRow = {
            localFramework: localFrameworkPath,
            expiryDate
        }

        rows.push(newRow)

        //turn the JSON data back into a string
        var newContent = JSON.stringify(rows)

        //update the file
        await file_manager.upsertFile(ignoreFilePath, newContent).catch((err) => {
            throw err;
        })

        return localFrameworkPath
    },

    updateFramework: async (args) => {

        //start off by downloading the latest version of the framework to the 'assets' directory
        var downloadUrl = args.source
        var extractedFolderName = args.extractedFolderName
        var downloadedFileName = extractedFolderName + '.zip'

        var downloadedZipFilePath = await file_manager.downloadThing(downloadUrl, assetsDir, downloadedFileName).catch((err) => {
            throw err;
        })

        await file_manager.extractThing(downloadedZipFilePath, assetsDir).catch((err) => {
            throw err;
        })

        await file_manager.ditchFile(downloadedZipFilePath).catch((err) => {
            throw err;
        })

        //clarify paths to engine and main license file on targetLocalFramework
        var localFrameworkPath = args.localFrameworkPath
        var targetLocalFrameworkEnginePath = localFrameworkPath + path.sep + 'engine'
        var targetLocalFrameworkMainDirLicensePath = localFrameworkPath + path.sep + 'license.txt'

        //clarify paths to engine and main license file on the downloaded Framework
        var rubbishExtractedFolderName = assetsDir + path.sep + args.extractedFolderName
        var downloadedEngineFolder = rubbishExtractedFolderName + path.sep + 'engine'
        var downloadedMainDirLicensePath = rubbishExtractedFolderName + path.sep + 'license.txt'

        //delete main license file and engine on targetLocalFramework
        await file_manager.ditchFile(targetLocalFrameworkMainDirLicensePath).catch((err) => {
            throw err;
        })

        await file_manager.deleteFolderRecursive(targetLocalFrameworkEnginePath).catch((err) => {
            throw err;
        })

        //copy the new stuff across
        await file_manager.copyThing(downloadedMainDirLicensePath, targetLocalFrameworkMainDirLicensePath).catch((err) => {
            throw err;
        })

        await file_manager.copyThing(downloadedEngineFolder, targetLocalFrameworkEnginePath).catch((err) => {
            throw err;
        })

        //clear the assets folder
        await file_manager.deleteFolderRecursive(rubbishExtractedFolderName).catch((err) => {
            throw err;
        })

        var currentFrameworkVersion = args.currentFrameworkVersion;
        return currentFrameworkVersion;
    }

}