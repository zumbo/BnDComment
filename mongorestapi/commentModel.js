var mongoose = require('mongoose');

var commentSchema = mongoose.Schema({
	key: {
        type: String,
        required: true
    },
    time: {
        type: Date,
		default: Date.now
    },
    user: {
        type: String,
        required: true
    },
    comment: {
        type: String,
        required: true
    }
});

var Comment = module.exports = mongoose.model('comment', commentSchema);
module.exports.get = function (callback, limit) {
    Comment.find(callback).limit(limit);
}