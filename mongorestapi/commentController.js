Comment = require('./commentModel');
// Handle index actions
exports.index = function (req, res) {
    Comment.get(function (err, comments) {
        if (err) {
            res.json({
                status: "error",
                message: err,
            });
        }
        res.json({
            status: "success",
            message: "Comments retrieved successfully",
            data: comments
        });
    });
};
// Handle create comment actions
exports.new = function (req, res) {
    var comment = new Comment();
	comment.key = req.body.key;
    comment.user = req.body.user;
    comment.comment = req.body.comment;
// save the comment and check for errors
    comment.save(function (err) {
        if (err)
            res.send(err);
 		else {
			res.json({
				message: 'New comment created!',
				data: comment
			});
		}
    });
};
exports.find = function (req, res) {
    Comment.find({ key: req.params.key }, function (err, comments) {
        if (err)
            res.send(err);
		else {
			res.json({
				message: 'Comment details loading..',
				data: comments
			});
		}
    });
};

exports.delete = function (req, res) {
    Comment.remove({
        _id: req.params.key
    }, function (err, comment) {
        if (err)
            res.send(err);
		res.json({
            status: "success",
            message: 'Comment deleted'
        });
    });
};