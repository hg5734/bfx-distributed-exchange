#kill -9 $(lsof -ti:20001,20002) # kill the existing process
grape --dp 20001 --aph 30001 --bn '127.0.0.1:20002' & grape --dp 20002 --aph 40001 --bn '127.0.0.1:20001' &