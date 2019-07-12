/**
*
* @author J. Bradley Briggs
*/
module.exports = class TMDbMovieInfo {
    constructor(apiKey) {
        this.apiKey = apiKey;
        this.HttpsRequest = require('./HttpsRequest');
    }

    getApiSearchUrl(movieTitle) {
        return `https://api.themoviedb.org/3/search/movie?api_key=${this.apiKey}&query=${movieTitle}`;
    }

    getApiGetUrl(movieId) {
        return `https://api.themoviedb.org/3/movie/${movieId}?api_key=${this.apiKey}&append_to_response=credits`;
    }

    getApiPosterUrl(posterPath) {
        return `https://image.tmdb.org/t/p/w500${posterPath}`;
    }

    getMovieTitle(moviePath) {
        var slashIndex = moviePath.lastIndexOf("\\"); //windows
        if (slashIndex == -1) slashIndex = moviePath.lastIndexOf("/"); //linux
        var title = moviePath.substr(slashIndex + 1);
        var dotIndex = title.lastIndexOf(".");
        if (dotIndex != -1) {
            title = title.substr(0, dotIndex);
        }
        if (title.includes("_")) {
            title = title.replace("_", "");
        }
        return title;
    }

    doSearch(moviePath) {
        var title = this.getMovieTitle(moviePath);
        var searchUrl = this.getApiSearchUrl(title);
        try {
            var request = new this.HttpsRequest();
            return request.getJSON(searchUrl);
        }
        catch (error) {
            throw error;
        }
    }

    getTMDbId(moviePath) {
        return new Promise((resolve, reject) => {
            this.doSearch(moviePath).then((result) => {
                if (result.total_results > 0) {
                    resolve(result.results[0].id);
                }
                else {
                    resolve(-1);
                }
            },
                (error) => {
                    reject("Error occurred while searching.");
                });
        });
    };

    getInfo(moviePath) {
        return new Promise((resolve, reject) => {
            this.getTMDbId(moviePath).then((result) => {
                if (result != -1) {
                    var url = this.getApiGetUrl(result);
                    try {
                        var request = new this.HttpsRequest();
                        resolve(request.getJSON(url));
                    }
                    catch (error) {
                        reject(error);
                    }
                }
                else {
                    reject(`Movie could not be found: ${moviePath}`);
                }
            })
        });
    }

    getPoster(posterPath) {
        return new Promise((resolve, reject) => {
            var url = this.getApiPosterUrl(posterPath);
            try {
                var request = new this.HttpsRequest();
                resolve(request.getData(url, 'hex'));
            }
            catch (error) {
                reject(error);
            }
        });
    }

    getAllInfo(moviePath) {
        return new Promise((resolve, reject) => {
            this.getInfo(moviePath).then(
                (result) => {
                    if (result == undefined) reject("Error retreiving movie info.");
                    var info = result;
                    var posterPath = result.poster_path;
                    var backdropPath = result.backdrop_path;
                    //console.log(result);
                    this.getPoster(posterPath).then((result) => {
                        info.poster_path = result;
                        this.getPoster(backdropPath).then((result) => {
                            info.backdrop_path = result;
                            resolve(info);
                        });
                    })
                }, (rej) => { resolve() });
        });
    }
}

// var info = new TMDbMovieInfo('fc5ff183740993a9da83dc48efab1511') ;

// info.getAllInfo('I:/Movies/Click.avi').then((movieInfo) => {console.log(movieInfo)}) ;