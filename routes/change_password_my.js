var express = require('express');
var util = require('./../common/util.js');
var user = require('./../controller/user.js');
var router = express.Router();

var err = {
  'errEmpty': false,
  'errReEmpty': false,
  'errfaildRePass': false,
  'errOther': false
}

/* GET home page. */
router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  res.render('change_password_my', { message: req.location_page_lang, err: err, _csrf: req.csrfToken() });
});

router.post('/', function(req, res, next) {
  util.resetObjectArray(err);
  // 新しいパスワード入力確認
  err.errEmpty = util.isEmpty(req.body.password);
  // パスワード確認入力確認
  err.errReEmpty = util.isEmpty(req.body.rePassword);

  // 新しいパスと確認パスが入力されているときに同じ値かを確認
  if(!err.errEmpty && !err.errReEmpty){
    // 新しいパスワードと確認パスワードが合っているかどうか
    err.errfaildRePass = req.body.password !== req.body.rePassword;
  }

  if(util.checkObjectArray(err)){
    res.render('change_password_my', { message: req.location_page_lang, err: err, _csrf: req.body._csrf });
  } else {
    // ユーザーIDからメールアドレスを取得
    user.getEmail(req.user.userId).then(function(email){
      // パスワードを暗号化
      var passwordHex = util.md5hex(req.body.password);
      // パスワード更新
      user.updateUserData(req.user.userId, email[0]['email'], {'password': '00'}, [passwordHex]).then(function(rows){
        res.render('change_password_my', { message: req.location_page_lang, success: true, err: err, _csrf: req.body._csrf });
      }).catch(function(err){
        // パスワード更新エラー
        err.errOther = true;
        res.render('change_password_my', { message: req.location_page_lang, faild: true, err: err, _csrf: req.body._csrf });
      });
    }).catch(function(err){
      // メールアドレス取得エラー
      err.errOther = true;
      res.render('change_password_my', { message: req.location_page_lang, faild: true, err: err, _csrf: req.body._csrf });
    });
  }
});

module.exports = router;
