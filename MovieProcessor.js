/**
*
* @author J. Bradley Briggs
*/
/*module.exports = */class MovieProcessor {
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
                    this.__throwError(`${this.moviePath} could not be processed.`);
                    resolve();
                }
            })
        })
    }

    // add() {
    //     return new Promise((resolve, reject) => {
    //         this.movieInfo.getAllInfo(this.moviePath).then((json) => {
    //             if (json) {
    //                 this.db.set(
    //                     {
    //                         title: encodeURI(json.original_title),
    //                         year: json.release_date,
    //                         genres: encodeURI(this.__jsonArrayGetFields(json.genres)),
    //                         overview: encodeURI(json.overview),
    //                         studios: encodeURI(this.__jsonArrayGetFields(json.production_companies)),
    //                         duration: json.duration,
    //                         homepage: encodeURI(json.homepage),
    //                         adult: (json.adult == 'true' ? 1 : 0),
    //                         collection: encodeURI(json.belongs_to_collection),
    //                         budget: json.budget,
    //                         tmdb_id: json.id,
    //                         imdb_id: json.imdb_id,
    //                         language: json.language,
    //                         popularity: json.popularity,
    //                         poster: `UNHEX('${json.poster_path}')`,
    //                         status: json.status,
    //                         tagline: encodeURI(json.tagline),
    //                         vote_average: json.vote_average,
    //                         vote_count: json.vote_count,
    //                         poster_backdrop: `UNHEX('${json.backdrop_path}')`,
    //                         cast: 'cast',
    //                         revenue: json.revenue,
    //                         spoken_languages: encodeURI(this.__jsonArrayGetFields(json.spoken_languages)),
    //                         target: encodeURI(this.moviePath)
    //                     }
    //                 )
    //                     .then((res) => { this.db.close(); resolve(res) }, (rej) => { this.db.close(); reject(rej) })
    //                     .catch((rej) => { this.db.close(); });
    //             }
    //             else {
    //                 console.log(`${this.moviePath} could not be added.`);
    //                 resolve();
    //             }
    //         });
    //     });
    // }

    // delete() {

    // }

    // update() {

    // }


}

var mov = new MovieProcessor("I:\\Movies\\S\\The Sunset Limited (2011)\\Avengers.mp4");
mov.process(true).then((res) => console.log(res));
console.log("[PROCESSING]");