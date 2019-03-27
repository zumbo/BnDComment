let router = require('express').Router();

router.get('/', function (req, res) {
    res.json({
        status: 'API is working',
        message: 'Welcome to Comment API!',
    });
});

var commentController = require('./commentController');

router.route('/comments')
    .get(commentController.index)
    .post(commentController.new);
router.route('/comments/:key')
    .get(commentController.find)
    .delete(commentController.delete);

module.exports = router;