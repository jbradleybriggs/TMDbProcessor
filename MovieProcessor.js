/**
*
* @author J. Bradley Briggs
*/
module.exports = class MovieProcessor {
    constructor(moviePath) {
        var TMDbMovieInfo = require('./TMDbMovieInfo');
        this.chalk = require('chalk');
        this.moviePath = moviePath;
        this.movieInfo = new TMDbMovieInfo('fc5ff183740993a9da83dc48efab1511');
    }

    __jsonArrayGetFields(array) {
        var result = "";
        if (typeof array == 'object') {
            for (var index in array) {
                if (array[index].name) {
                    result += array[index].name;
                    if (index != array.length - 1) result += ", ";
                }
            }
        }
        return result;
    }

    __throwError(msg) {
        console.log("\t" + this.chalk.redBright("[ERROR]: " + msg))
    }

    __resolveRelativePath(relativePath) {
        // example path: ..\..\somewhereElse\newTempFile
        // ../temp/newTempFile

        var os = process.platform;
        var absPath = process.argv[1]; // absolute file path of file run with node (should be ....../RiftServer.js)
        var delim = "";
        //console.log("[ABS]  " + absPath);
        //get the directory we are currently running in: (without last slash)
        if (os == 'win32') delim = "\\";
        else if (os == 'linux' || os == 'darwin') delim = "/";

        function up() {
            absPath = absPath.slice(0, absPath.lastIndexOf(delim));
        }

        function into(folder) {
            absPath += folder;
        }

        //absPath = absPath.slice(0, absPath.lastIndexOf(delim)) ;
        up();
        while (relativePath.length > 0) {
            var slash = relativePath.indexOf(delim);
            if (slash != -1) {
                var action = relativePath.slice(0, slash);
                if (action == '..') {
                    //move up one level
                    up();

                    relativePath = relativePath.slice(slash + 1);
                }
                else if (action == '.') {
                    //in this directory
                    absPath += relativePath.slice(slash);
                    relativePath = "";
                }
                else {
                    into(delim + action);
                    relativePath = relativePath.substr(slash + 1);
                }
            }
            else { //no slash
                into(`${delim}${relativePath}`);
                relativePath = "";
            }
            // console.log("=>" + absPath) ;
            // console.log("|=>" + relativePath) ;
        }
        return absPath;
    }

    __createHash(length = 30) {
        var alphabet = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        var i = 0;
        var result = "";
        while (i < length) {
            var index = Math.floor(Math.random() * (alphabet.length - 1));
            result += alphabet.charAt(index);
            i++;
        }
        return result;
    }

    async __createTempFile(fileName = "", fileType = ".bin", bufferedData = []) {
        return new Promise(async (resolve, reject) => {
            var fs = require('fs');
            var slash = (process.platform == 'win32' ? '\\' : '/');
            var tempDir = this.__resolveRelativePath(`..${slash}temp${slash}`);
            try {
                fs.mkdirSync(tempDir);
            } catch (error) { }

            if (!fileName || fileName == "")
                var temp = this.__resolveRelativePath(`..${slash}temp${slash}${this.__createHash()}${fileType}`);
            else var temp = this.__resolveRelativePath(`..${slash}temp${slash}${fileName}${fileType}`);
            //fs.open(temp) ;
            console.log(`[CREATE]: ${temp}`)
            await fs.appendFile(temp, bufferedData, (err) => {
                if (err) {
                    this.__throwError(err);
                    reject(err);
                }
            });
            resolve(temp);
        });
    }

    async process(createResources = true) {
        return new Promise((resolve, reject) => {
            this.movieInfo.getAllInfo(this.moviePath).then((json) => {
                if (json) {
                    (async () => {
                        if (createResources) { // create covers and backdrops
                            if (json.poster_path) { //data is in hex
                                var buf = Buffer.from(json.poster_path, 'hex');
                                json.poster_path = await this.__createTempFile("", ".jpg", buf);
                            }

                            if (json.backdrop_path) { //data is in hex
                                var buf = Buffer.from(json.backdrop_path, 'hex');
                                json.backdrop_path = await this.__createTempFile("", ".jpg", buf);
                            }
                        }
                    })()
                        .then(() => {
                            if (json.collection) json.collection = this.__jsonArrayGetFields(json.collection);
                            if (json.genres) json.genres = this.__jsonArrayGetFields(json.genres);
                            if (json.production_companies) json.production_companies = this.__jsonArrayGetFields(json.production_companies);
                            if (json.spoken_languages) json.spoken_languages = this.__jsonArrayGetFields(json.spoken_languages);
                            if (json.production_countries) json.production_countries = this.__jsonArrayGetFields(json.production_countries);
                            if (json.credits && json.credits.cast) {
                                json.cast = this.__jsonArrayGetFields(json.credits.cast);
                                delete json.credits;
                            }
                            json.target = encodeURI(this.moviePath);

                            ///
                            resolve(json);
                        });
                }
                else {
                    this.__throwError(`${this.moviePath} could not be processed, or movie not found.`);
                    resolve();
                }
            })
        })
    }
}

// var mov = new MovieProcessor("I:\\Movies\\S\\The Sunset Limited (2011)\\Avengers.mp4");
// mov.process(true).then((res) => console.log(res));
// console.log("[PROCESSING]");