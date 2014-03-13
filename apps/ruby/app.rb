# hello.rb
require 'sinatra'

set :public_folder, File.dirname(__FILE__) + '/public'
set :bind, '0.0.0.0'
set :environment, :production

get '/' do
  erb :index
end