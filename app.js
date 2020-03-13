var express = require('express');
var path = require('path');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var session = require('express-session');
var csurf = require('csurf');
var bodyParser = require('body-parser');
var ECT = require('ect');
var i18n = require('i18n');
var basicAuth = require('basic-auth-connect');
var passport = require('passport');
var LocalStrategy = require('passport-local').Strategy;

var util = require('./common/util.js');
var user = require('./controller/user.js');

var index = require('./routes/index');
var signup_init = require('./routes/signup_init');
var signup = require('./routes/signup');
var user_register = require('./routes/user_register');
var login = require('./routes/login');
var logout = require('./routes/logout');
var two_fa = require('./routes/two_fa');
var change_email = require('./routes/change_email');
var forgot_password = require('./routes/forgot_password');
var change_password = require('./routes/change_password');
var my = require('./routes/my');
var setting = require('./routes/setting');
var change_email_my = require('./routes/change_email_my');
var change_password_my = require('./routes/change_password_my');
var change_nickname_my = require('./routes/change_nickname_my');
var change_twofa_my = require('./routes/change_twofa_my');
var unsubscribe = require('./routes/unsubscribe');

var app = express();

app.use(basicAuth('svs', 'svs'));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.engine('ect', ECT({ watch: true, root: __dirname + '/views', ext: '.ect' }).render);
app.set('view engine', 'ect');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: false }));

// セッション設定
app.use(cookieParser());
app.use(session({
  secret: 'bdKRD5pQgk6Wy2Bg',
  resave: false,
  saveUninitialized: false,
  maxAge: 86400000
}));

// CSRF対策
app.use(csurf({ cookie: true }));

// publicフォルダをルーティング化
app.use(express.static(path.join(__dirname, 'public')));
app.use(express.static(path.join(__dirname, 'node_modules')));

// 多言語化
i18n.configure({
  locales: ['ja', 'en'],
  defaultLocale: 'ja',
  directory: __dirname + "/locales",
  objectNotation: true
});

app.use(i18n.init);
app.use(function(req, res, next){
  if(req.session.locale){
    i18n.setLocale(req, req.session.locale);
  }

  // 対応するページの言語情報を取得
  var location_page = req.originalUrl.split('/')[1].split('?')[0];
  if(util.isEmpty(location_page)){
    var location_page = 'index';
  }

  req.location_page_lang = req.__(location_page);

  next();
});

// ログイン認証
app.use(passport.initialize());
app.use(passport.session());
passport.use(
  new LocalStrategy(
    {
      usernameField: 'email',
      passwordField: 'password'
    },
    function(email, password, done){
      // ユーザーIDを取得
      user.getUserIdForLogin(email, password).then(function(userid){
        var userData = {
          'userId': userid[0]['user_id'],
          'nickname': userid[0]['nickname'],
          'twofa': false
        };

        // 二段階認証を走らせるかをここで見る
        user.getTwoFaSetting(userid[0]['user_id']).then(function(twofa){
          if(twofa[0]['twofa'].readInt8(0) !== 0){
            userData['twofa'] = true;
          }

          return done(null, userData);
        }).catch(function(err){
          return done(null, false);
        });
      }).catch(function(err){
        // ユーザーID取得失敗
        return done(null, false);
      });
    }
  )
);

app.use('/', index);
app.use('/signup_init', signup_init);
app.use('/signup', signup);
app.use('/user_register', user_register);
app.use('/login', login);
app.use('/logout', logout);
app.use('/change_email', change_email);
app.use('/forgot_password', forgot_password);
app.use('/change_password', change_password);
app.use('/two_fa', isAuthenticated, two_fa);
app.use('/my', isAuthenticated, my);
app.use('/setting', isAuthenticated, setting);
app.use('/change_email_my', isAuthenticated, change_email_my);
app.use('/change_password_my', isAuthenticated, change_password_my);
app.use('/change_nickname_my', isAuthenticated, change_nickname_my);
app.use('/change_twofa_my', isAuthenticated, change_twofa_my);
app.use('/unsubscribe', isAuthenticated, unsubscribe);


// セッション確認
passport.serializeUser(function(user, done){
  done(null, user);
});

passport.deserializeUser(function(user, done){
  done(null, user);
});

function isAuthenticated(req, res, next){
  // 認証済みでかつユーザーIDが判明している場合はページを表示
  if(req.isAuthenticated() && !util.isEmpty(req.user['userId'])){
    return next();
  }

  req.logout();
  res.redirect('/login');
}

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;
