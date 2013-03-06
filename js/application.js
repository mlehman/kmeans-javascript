var KMeans = {

    squaredEuclideanDistance: function(p1, p2){
        return Math.pow(p1[0] - p2[0], 2)
            + Math.pow(p1[1] - p2[1], 2);
    },

    nearestCentroid: function(centroids, observation) {
        var distances = centroids.map( function(centroid) {
            return KMeans.squaredEuclideanDistance(centroid, observation);
        })
        return distances.indexOf(Math.min.apply(Math, distances));
    },

    nearestCentroids: function(observations, centroids) {
        var clusters = centroids.map(function(){ return [];});
        observations.forEach(function(observation){
            clusters[KMeans.nearestCentroid(centroids, observation)].push(observation);
        });
        return clusters;
    },

    centerClusters: function(clusters, maxValue) {

        return clusters.map( function(cluster){
            if(cluster.length > 0){
                return cluster.reduce( function(previousValue, currentValue) {
                    return [previousValue[0]+currentValue[0],previousValue[1]+currentValue[1]]
                }).map( function(x) { return x / cluster.length });
            } else {
                var observations = clusters.reduce( function(previousValue, currentValue) {
                    return previousValue.concat(currentValue);
                });
                return KMeans.Utility.selectRandomPoints(1, observations)[0];
            }
        });
    },

    isConverged: function(c1, c2){
        return (c1.join('') == c2.join(''));
    }
}

KMeans.Utility = {

    randomNumber: function(ceiling) {
        return Math.random() * ceiling;
    },

    randomPoint: function(ceiling) {
        return [KMeans.Utility.randomNumber(ceiling), KMeans.Utility.randomNumber(ceiling)];
    },

    gaussianPoint: function(point, range, ceiling) {
        var v1, v2, s, x, y;
        do {
            do {
                v1 = 2 * Math.random() - 1;   // between -1.0 and 1.0
                v2 = 2 * Math.random() - 1;   // between -1.0 and 1.0
                s = v1 * v1 + v2 * v2;
            } while (s >= 1 || s == 0);
            var multiplier = Math.sqrt(-2 * Math.log(s)/s);
            x = point[0] + (v2 * multiplier * range);
            y = point[1] + (v1 * multiplier * range);
        } while (x < 0 || y < 0 || x > ceiling || y > ceiling);
        return [x, y];
    },

    createPoints: function(n, pointFn) {
        var points = [];
        for(var i = 0; i < n; i++){
            points[i] = pointFn();
        }
        return points;
    },

    createRandomPoints: function(n, ceiling) {
        return KMeans.Utility.createPoints(n, function(){
            return KMeans.Utility.randomPoint(ceiling);
        })
    },

    createGaussianPoints: function(n, centers, ceiling) {
        return KMeans.Utility.createPoints(n, function() {
            var randomIndex = Math.floor(KMeans.Utility.randomNumber(centers.length));
            var center = centers[randomIndex];
            return KMeans.Utility.gaussianPoint(center, 0.5, ceiling);
        })
    },

    selectRandomPoints: function(n, points) {
        var indexes = [];
        for(var i = 0; i < n; i++){
            var r;
            do {
               r = Math.floor(KMeans.Utility.randomNumber(points.length));
            } while ( indexes.indexOf(r) > 0 )
            indexes.push(r);
        }
        return indexes.map(function(i) {
            return points[i];
        });
    }

}


KMeans.Demo = {}

KMeans.Demo.createVisualization = function(selector, maxValue) {

    var colors = ["red","green","blue","yellow","orange","grey"];
    var vizPadding = 0.5;
    var animationDuration = 750;

    var visualizationSvg;
    var vizDimension;
    var linearScale;

    var addLineAnimation = function(lineSelection, point) {
        return lineSelection
            .attr("x1", function (d) { return linearScale(d[0]); })
            .attr("y1", function (d) { return linearScale(d[1]); })
            .attr("x2", function (d) { return linearScale(d[0]); })
            .attr("y2", function (d) { return linearScale(d[1]); })
            .transition()
                .duration(animationDuration)
                .attr("x2", linearScale(point[0]))
                .attr("y2", linearScale(point[1]));
    }

    var setUpVisualization = function() {

        vizDimension = $(selector).width()*.70;

        linearScale = d3.scale.linear()
            .domain([-vizPadding, maxValue + vizPadding])
            .range([0, vizDimension]);

        visualizationSvg = d3.select(selector).append("svg")
            .attr("width", vizDimension)
            .attr("height", vizDimension)
            .style("display", "block")
            .style("margin", "0 auto")
            .style("background-color", "#ffffff")
            .style("border", "1px solid black");
    }

    var updatePoints = function(points, klass, color) {

        var pointSelection = visualizationSvg.selectAll("circle." + klass)
            .data(points);

        pointSelection.transition()
            .duration(animationDuration)
            .attr("cx", function (d) { return linearScale(d[0]); })
            .attr("cy", function (d) { return linearScale(d[1]); });

        pointSelection.enter()
            .append("circle")
            .attr("class", klass)
            .attr("cx", function (d) { return linearScale(d[0]); })
            .attr("cy", function (d) { return linearScale(d[1]); })
            .attr("r", 5)
            .style("fill", color)
            .style("fill-opacity", 1e-6)
            .transition()
                .duration(750)
                .attr("y", 0)
                .style("fill-opacity", 1);

        pointSelection.exit().remove();
    };

    return {
        init: function() {

            setUpVisualization();

            $(window).resize(function() {
                visualizationSvg.remove();
                setUpVisualization();
            });
        },

        clearCentroids: function() {
            visualizationSvg.selectAll("line").remove();
            visualizationSvg.selectAll("circle.centroids").remove();
        },

        clearClusters: function() {
            visualizationSvg.selectAll("line").remove();
        },

        updateObservations: function(observations) {
            updatePoints(observations, "data", "black");
        },

        updateCentroids: function(centroids) {
            updatePoints(centroids, "centroids", function(d,i){ return colors[i]; });
        },

        updateClusters: function(clusters, centroids) {
            clusters.forEach( function(points, index){
                var lineSelection = visualizationSvg.selectAll("line.centroid" + index)
                    .data(points);

                var lineAnimation = addLineAnimation(lineSelection, centroids[index]);

                lineAnimation = addLineAnimation(
                    lineSelection.enter().append("line")
                        .attr("class", "centroid" + index)
                        .attr("stroke-width", 2)
                        .attr("stroke", colors[index]), centroids[index]);

                lineSelection.exit().remove();
            });
        },

        updateClusterCentroids: function(clusters, centroids) {
            clusters.forEach( function(points, index){
                var lineSelection = visualizationSvg.selectAll("line.centroid" + index)
                    .data(points);

                lineSelection
                    .transition()
                    .duration(750)
                    .attr("x2", linearScale(centroids[index][0]))
                    .attr("y2", linearScale(centroids[index][1]));

            });
        }
    };
};

KMeans.Demo.Application = (function() {

    var that; //reference for callbacks
    var visualization;

    var observations = [];
    var centroids = [];

    var maxValue = 10;
    var numObservations = 100;
    var numCentroids = 3;
    var iterationDelay = 1000;

    return {
        init: function() {
            that = this;
            $(document).ready(function() {

                visualization = KMeans.Demo.createVisualization("#visualization", maxValue);
                visualization.init();

                $("#inputNumObservations")
                    .val(numObservations)
                    .change( function() {
                    numObservations = parseInt($(this).val(),10);
                });

                $("#inputNumCentroids")
                    .val(numCentroids)
                    .change( function() {
                    numCentroids = parseInt($(this).val(),10);
                });

                var buttonGenerate = $("#buttonGenerate");
                buttonGenerate.click(that.generateData);

                var buttonCluster = $("#buttonCluster");
                buttonCluster.click(that.cluster);
            });
        },

        cluster: function() {
            visualization.clearClusters();
            that.setCentroids(KMeans.Utility.selectRandomPoints(numCentroids, observations));
            setTimeout(function() { that.updateCentroids(); }, iterationDelay);
            return false;
        },

        setObservations: function(points) {
            observations = points;
            visualization.clearClusters();
            visualization.updateObservations(observations);
        },

        setCentroids: function(points) {
            centroids = points;
            visualization.updateCentroids(centroids);
        },
        generateData: function() {
           var centers = KMeans.Utility.createRandomPoints(numCentroids, maxValue);
           that.setObservations(KMeans.Utility.createGaussianPoints(numObservations, centers, maxValue));
        },
        updateCentroids: function() {
            var clusters = KMeans.nearestCentroids(observations, centroids);
            visualization.updateClusters(clusters, centroids);

            setTimeout(function() {
                var newCentroids = KMeans.centerClusters(clusters, maxValue);
                if(!KMeans.isConverged(newCentroids,centroids)){
                    that.setCentroids(newCentroids);
                    visualization.updateClusterCentroids(clusters, centroids);
                    setTimeout(function() { that.updateCentroids(); }, iterationDelay);
                }
            }, iterationDelay);
        }
    }
}());

KMeans.Demo.Application.init();