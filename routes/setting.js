var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('setting', { message: req.location_page_lang });
});

module.exports = router;
