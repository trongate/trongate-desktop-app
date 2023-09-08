const download = require('download');
const extract = require('extract-zip')
const fse = require('fs-extra')
const path = require('path')
const { dialog } = require('electron')
const request_manager = require("./request_manager.js")

function makeADirectory(dirPath) {

    return new Promise((resolve, reject) => {

        if (!fse.existsSync(dirPath)) {
            var nodefs = require('fs')
            nodefs.mkdirSync(dirPath)
            resolve(true)
            
        } else {
            resolve(true)
        }

    })

}

function openSelectDir(params) {
    return new Promise((resolve, reject) => {

        var tempParams = JSON.parse(params.tempParams);
        var selectorBtnText = tempParams.selectorBtnText

        dialog.showOpenDialog({
            buttonLabel: selectorBtnText,
            properties: ['openDirectory', 'createDirectory']
        }).then(openPath => {
            var filePaths = openPath.filePaths
            var selectedPath = filePaths[0]
            selectedPath = selectedPath.replace(/\\/g, '/');

            var response = {
                selectedPath
            }

            resolve(JSON.stringify(response))

        }).catch(err => {
            reject(err)
        })
        

    })
}

function doesThisExist(targetPath) {

    return new Promise((resolve, reject) => {

        try {

            if (fse.existsSync(targetPath)) {
                resolve(true)
            } else {
                resolve(false)
            }

        } catch (err) {
            reject(err)
        }

    })

}

function downloadThing(downloadUrl, destinationDir, downloadedFileName) {

    return new Promise((resolve, reject) => {

        // Url of the image
        const file = downloadUrl;
        // Path at which image will get downloaded
        const filePath = destinationDir;
  
        download(file,filePath)
        .then(() => {
            var completeDownloadedFilePath = filePath + path.sep + downloadedFileName;
            resolve(completeDownloadedFilePath)

        })

    })

}

function downloadThingBULLSCHITT(downloadUrl, destinationDir, downloadedFileName) {

    return new Promise((resolve, reject) => {

        var url = downloadUrl
        var options = {
            directory: destinationDir,
            filename: downloadedFileName
        }

        download(url, options, function(err){
            if (err) {
                reject('ABC: ' + err)
            } else {
                var completeDownloadedFilePath = options.directory + path.sep + options.filename
                resolve(completeDownloadedFilePath)
            }
            
        })        

    })

}

function extractThing(source, container) {
    //the source is the pathway to the zip file
    //the container is where you want to new contents to go
    return new Promise((resolve, reject) => {

        extract(source, {dir: container}, function (err) {
            // extraction is complete. make sure to handle the err
            if (err) {
                reject(err)
            }

            var unzippedLocation = container
            resolve(unzippedLocation);
        })

    })    
}

function ditchFile(fileToGo) {

    return new Promise((resolve, reject) => {

        if (fse.existsSync(fileToGo)) {

            fse.chmod(fileToGo, 0777, function (err) {
                if (err) { 
                    reject(err) 
                } else {

                    fse.unlink(fileToGo, function (err) {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(fileToGo)
                        }
                        
                    })


                }

            })

        } else {
            resolve(true)
        }        

    })
    
}

function renameThing(oldName, newName) {

    return new Promise((resolve, reject) => {

        if (fse.existsSync(newName)) {


            reject(newName + ' already exists');

 //           reject('Error: the target new file/dir name already exists!')
        } else {

            if (fse.existsSync(oldName)) {

                fse.rename(oldName, newName, function (err) {
                    if (err) {
                        reject(err)
                    } else {
                        resolve(newName)
                    }
                })

            } else {

                if (!oldName) {
                    var errMsg = 'ERROR: Unable to rename.  No source defined.'
                } else {
                    var errMsg = `Error:  target file or dir does not exist!`
                }

                reject(errMsg)

            }

        }        

    })

}

function moveThing(oldPath, newPath) {

    return new Promise((resolve, reject) => {

        try {
          fse.copySync(oldPath, newPath)
          resolve(true)
        } catch (err) {
          reject(err)
        }

    })    

}

function is_dir(targetDir) {
    return new Promise((resolve, reject) => {

        try {
            var stat = fse.lstatSync(targetDir)
            var isDir = stat.isDirectory()

            if (isDir == true) {
                resolve(true)
            } else {
                resolve(false)
            }

        } catch (e) {
            resolve(false)
        }

    })  
}

function deleteFolderRecursive(dirToGo) {

    return new Promise((resolve, reject) => {

            if (fse.existsSync(dirToGo)) {
                fse.readdirSync(dirToGo).forEach(function(file,index) {
                    var curPath = dirToGo + path.sep + file
                    if(fse.lstatSync(curPath).isDirectory()) { // recurse
                        deleteFolderRecursive(curPath)
                    } else { // delete file
                        fse.unlinkSync(curPath)
                    }
                })

                fse.rmdirSync(dirToGo)
            }

          resolve(true)
    })

}


function ditchFile(fileToGo) {

    return new Promise((resolve, reject) => {

        if (fse.existsSync(fileToGo)) {

            fse.chmod(fileToGo, 0777, function (err) {
                if (err) { 
                    reject(err) 
                } else {

                    fse.unlink(fileToGo, function (err) {
                        if (err) {
                            reject(err)
                        } else {
                            resolve(fileToGo)
                        }
                        
                    })


                }

            })

        } else {
            resolve(true)
        }        

    })
    
}

function changePermission(filePath, newValue) {

    return new Promise((resolve, reject) => {

        if (fse.existsSync(filePath)) {

            var nodefs = require('fs')
            nodefs.chmod(filePath, newValue, (err) => {
                if (err) {
                    reject(err) //there appears to be an issue with linux and permissions - so...
                    //let's not hold the process back with an error.
                } else {
                    resolve(true)
                }

            });
            
        } else {
            resolve(true)
        }

    })

}

function chmodFolderRecursive(targetPath, chmodValue) {

    return new Promise((resolve, reject) => {

          if(fse.existsSync(targetPath) ) {

            changePermission(targetPath, chmodValue);
            fse.readdirSync(targetPath).forEach(function(file,index){
                var curPath = targetPath + path.sep + file;
                changePermission(curPath, chmodValue);
            });

          }

          resolve(true);
    })

}

function upsertFile(filePath, fileContent) {

    return new Promise((resolve, reject) => {
        fse.writeFile(filePath, fileContent, function(err, data) {
            if (err) {
                reject(err)
            } else {
                resolve(true)
            }

        })
          

    })

}

function readTheFile(filePath) {

    return new Promise((resolve, reject) => {

        fse.readFile(filePath, function(err, buf) {

            if (err) {
                reject('Unable to read file at <br><span style="clear: both; font-size: 0.5em;">' + filePath + '</span>')
            } else {
                var fileContent = buf.toString()
                resolve(fileContent)
            }

        })

    })

}

function listTheDir(dirPath) {
    //return a list of files and directories
    return new Promise((resolve, reject) => {

        var dirItems = []

        fse.readdir(dirPath, (err, files) => {

          files.forEach(file => {
            dirItems.push(file)
          })

          resolve(dirItems)
        })

    })
}

function deleteFolderRecursive(dirToGo) {

    return new Promise((resolve, reject) => {

            if (fse.existsSync(dirToGo)) {
                fse.readdirSync(dirToGo).forEach(function(file,index) {
                    var curPath = dirToGo + path.sep + file
                    if(fse.lstatSync(curPath).isDirectory()) { // recurse
                        deleteFolderRecursive(curPath)
                    } else { // delete file
                        fse.unlinkSync(curPath)
                    }
                })

                fse.rmdirSync(dirToGo)
            }

          resolve(true)
    })

}















































module.exports = {

    openSelectDir: async (args) => {
        var responseVibe = openSelectDir(args)
        return responseVibe
    },

    doesThisExist: async (targetPath) => {
        var doesThisExistResult = await doesThisExist(targetPath)
        return doesThisExistResult
    },

    downloadThing: async (downloadUrl, destinationDir, downloadedFileName) => {

        var doesDirExist = await doesThisExist(destinationDir)

        if (doesThisExist == true) {
            await deleteFolderRecursive(destinationDir)
        }

        var downloadedFileLocation = await downloadThing(downloadUrl, destinationDir, downloadedFileName)
        return downloadedFileLocation
    },

    extractThing: async (source, container) => {
        var unzippedLocation = await extractThing(source, container)
        return unzippedLocation
    },

    ditchFile: async (fileToGo) => {
        await ditchFile(fileToGo)
        return true
    },

    renameThing: async (oldName, newName) => {
        var newName = await renameThing(oldName, newName)
        return newName
    },

    moveThing: async (oldPath, newPath) => {

        await moveThing(oldPath, newPath)

        //is this a directory or a file?
        var isDirectory = await is_dir(oldPath)

        if (isDirectory == true) {
            await deleteFolderRecursive(oldPath)
        } else {
            await ditchFile(oldPath)
        }

        return newPath

    },

    copyThing: async (oldPath, newPath) => {
        await moveThing(oldPath, newPath)
        return newPath
    },    

    changePermission: async (filePath, newValue) => {
        await changePermission(filePath, newValue)
        return true
    },

    chmodFolderRecursive: async (targetPath, chmodValue) => {
        await chmodFolderRecursive(targetPath, chmodValue)
        return true
    },

    upsertFile: async (filePath, fileContent) => {
        await upsertFile(filePath, fileContent)
        return true
    },

    readTheFile: async (filePath) => {
        var filePath = filePath
        var fileContent = await readTheFile(filePath)
        return fileContent
    }, 

    checkFoldersExist: async (folders) => {
        //return true or err
        var numFolders = folders.length;
        var score = 0;

        for (var i = 0; i < folders.length; i++) {
            var doesThisExistResult = await doesThisExist(folders[i])
            if (doesThisExistResult == true) {
                score++;
            }
        }
 
        if (score == numFolders) {
            return true;
        } else {
            throw 'The directory that you selected does not appear to be a valid Trongate app'
        }

    },

    makeADirectory: async (dirPath) => {
        await makeADirectory(dirPath)
        var result = true
        return result
    },

    isDir: async (dirPath) => {
        var isDir = await is_dir(dirPath)
        return isDir
    },

    listTheDir: async (dirPath) => {
        var dirItems = await listTheDir(dirPath)
        return dirItems    
    },

    listSubDirs: async (dirPath) => {
        var subDirs = []
        var dirItems = await listTheDir(dirPath)

        for(i = 0; i<dirItems.length; i++) {
            var targetItem = dirPath + path.sep + dirItems[i]
            var isDir = await is_dir(targetItem)

            if (isDir == true) {
                subDirs.push(dirItems[i])
            }
        }

        return subDirs    
    },

    deleteFolderRecursive: async (dirToGo) => {
        await deleteFolderRecursive(dirToGo)
        return true
    },

    createRelationSettingsFile: async(args) => {
        var params = {}
        params.code = 'MRL_REQUEST_SETTINGS'
        params.firstModule = args.firstModuleName
        params.secondModule = args.secondModuleName
        params.relationshipType = args.relationshipType
        params.firstModuleSingular = args.firstModuleSingular
        params.secondModuleSingular = args.secondModuleSingular
        params.firstModulePlural = args.firstModulePlural
        params.secondModulePlural = args.secondModulePlural
        params.firstModuleIdentifierColumn = args.firstModuleIdentifierColumn
        params.secondModuleIdentifierColumn = args.secondModuleIdentifierColumn

        var targetUrl = args.apiUrl;
        var settingsCode = await request_manager.submitPostRequest(targetUrl, params, false).catch((err) => {
            initErrorMsg(err, 'small-window-channel')
            return
        })

        var settingsPath = args.settingsPath;

        //make sure got settings dir 
        var settingsDir = args.localFrameworkPath + path.sep + 'modules' + path.sep + 'module_relations' + path.sep + 'assets' + path.sep + 'module_relations'

        var settingsDirExists = await doesThisExist(settingsDir).catch((err) => {
            throw err;
        })

        if (settingsDirExists == false) {
            await makeADirectory(settingsDir).catch((err) => {
                throw err;
            })
        }

        await upsertFile(settingsPath, JSON.stringify(settingsCode)).catch((err) => {
            throw err
        })

        await changePermission(settingsPath, '0777').catch((err) => {
            throw err
        })
        
        return
    }

}