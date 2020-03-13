var express = require('express');
var util = require('./../common/util.js');
var user = require('./../controller/user.js');
var router = express.Router();

var err = {
  'errLength': false,
  'errEmpty': false,
  'errOther': false
}

/* GET home page. */
router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  res.render('change_nickname_my', { message: req.location_page_lang, currentNickname: req.user.nickname, err: err, _csrf: req.csrfToken() });
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);
  // 入力確認
  err.errEmpty = util.isEmpty(req.body.nickname);
  // 名前長さ確認
  err.errLength = req.body.nickname.length > 20;

  if(util.checkObjectArray(err)){
    res.render('change_nickname_my', { message: req.location_page_lang, currentNickname: req.user.nickname, err: err, _csrf: req.body._csrf });
  } else {
    // 名前を変更するためにメアド取得
    user.getEmail(req.user.userId).then(function(email){
      // 名前を更新
      user.updateUserData(req.user.userId, email[0]['email'], {'nickname': '00'}, [req.body.nickname]).then(function(rows){
        req.user.nickname = req.body.nickname;
        res.render('change_nickname_my', { message: req.location_page_lang, currentNickname: req.user.nickname, success: true, err: err, _csrf: req.body._csrf });
      }).catch(function(err){
        err.Other = true;
        res.render('change_nickname_my', { message: req.location_page_lang, currentNickname: req.user.nickname, faild: true, err: err, _csrf: req.body._csrf });
      });
    }).catch(function(err){
      err.Other = true;
      res.render('change_nickname_my', { message: req.location_page_lang, currentNickname: req.user.nickname, faild: true, err: err, _csrf: req.body._csrf });
    });
  }
});

module.exports = router;
