var express = require('express');
var util = require('./../common/util.js');
var user = require('./../controller/user.js');
var router = express.Router();

var err = {
  'errEmail': false,
  'errAddress': false,
  'errPass': false,
  'errOther': false
}

/* GET home page. */
router.get('/', function(req, res, next) {
  util.resetObjectArray(err);
  res.render('unsubscribe', { message: req.location_page_lang, err:err, _csrf: req.csrfToken() });
});

router.post('/', function(req, res, next){
  util.resetObjectArray(err);
  // パスワード未入力チェック
  err.errPass = util.isEmpty(req.body.password);

  // メールアドレス未入力チェック
  err.errEmail = util.isEmpty(req.body.email);

  // メールアドレス判定
  err.errAddress = !util.isEmail(req.body.email);

  // エラーがある場合はエラー箇所を表示
  if(util.checkObjectArray(err)){
    res.render('unsubscribe', {message: req.location_page_lang, email: req.body.email, password: req.body.password, err: err, _csrf: req.body._csrf });
  } else {
    // ユーザーの存在確認
    res.render('unsubscribe', { message: req.location_page_lang, email: req.body.email, password: req.body.password, err:err, _csrf: req.body._csrf });
  }
});

module.exports = router;
