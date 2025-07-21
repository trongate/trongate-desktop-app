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

            var localFrameworkVersionMatch = licenseContents.match(/(?<=Version:\s)\d+(\.\d+)*/)
            
            if (!localFrameworkVersionMatch) {
                reject(new Error('Unable to find "Version: " in license.txt'));
            }

            var localFrameworkVersion = localFrameworkVersionMatch[0];

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
        // Start off by downloading the latest version of the framework
        var downloadUrl = args.source;
        var extractedFolderName = args.extractedFolderName;
        var downloadedFileName = extractedFolderName + '.zip';

        // Download the zip file
        var downloadedZipFilePath = await file_manager.downloadThing(downloadUrl, assetsDir, downloadedFileName);

        // Extract the contents of the newly downloaded zip file
        await file_manager.extractThing(downloadedZipFilePath, assetsDir);

        // Delete the zip file
        await file_manager.ditchFile(downloadedZipFilePath);

        var localFrameworkPath = args.localFrameworkPath;
        var rubbishExtractedFolderName = path.join(assetsDir, args.extractedFolderName);

        // Always update 'engine' directory and license files
        await updateEngineAndLicense(rubbishExtractedFolderName, localFrameworkPath);

        // Handle user selections
        if (args.userSelections) {
            const userSelections = JSON.parse(args.userSelections);
            await updateSelectedItems(rubbishExtractedFolderName, localFrameworkPath, userSelections);
        }

        // Clear the assets folder
        await file_manager.deleteFolderRecursive(rubbishExtractedFolderName);

        return args.currentFrameworkVersion;
    }

}

async function updateEngineAndLicense(sourcePath, targetPath) {
    // Update engine directory
    const sourceEnginePath = path.join(sourcePath, 'engine');
    const targetEnginePath = path.join(targetPath, 'engine');
    await file_manager.deleteFolderRecursive(targetEnginePath);
    await file_manager.copyThing(sourceEnginePath, targetEnginePath);

    // Update main license file
    const sourceLicensePath = path.join(sourcePath, 'license.txt');
    const targetLicensePath = path.join(targetPath, 'license.txt');
    await file_manager.copyThing(sourceLicensePath, targetLicensePath);
}

async function updateSelectedItems(sourcePath, targetPath, selections) {
    for (const item of selections) {
        if (item === 'engine' || item === 'license.txt') continue; // Already handled

        const sourceItemPath = path.join(sourcePath, item);
        const targetItemPath = path.join(targetPath, item);

        const isDirectory = await file_manager.isDir(sourceItemPath);
        if (isDirectory) {
            await updateDirectory(sourceItemPath, targetItemPath);
        } else {
            await file_manager.copyThing(sourceItemPath, targetItemPath);
        }
    }
}

async function updateDirectory(sourceDir, targetDir) {
    await file_manager.makeADirectory(targetDir);
    const items = await file_manager.listTheDir(sourceDir);
    for (const item of items) {
        const sourceItemPath = path.join(sourceDir, item);
        const targetItemPath = path.join(targetDir, item);

        const isDirectory = await file_manager.isDir(sourceItemPath);
        if (isDirectory) {
            await updateDirectory(sourceItemPath, targetItemPath);
        } else {
            await file_manager.copyThing(sourceItemPath, targetItemPath);
        }
    }
}