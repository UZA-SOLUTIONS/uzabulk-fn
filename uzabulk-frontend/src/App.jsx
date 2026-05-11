import { Provider } from "react-redux";
import { ToastContainer } from "react-toastify";

import "./App.css";
import "./assets/css/style.css";
import "bootstrap/dist/css/bootstrap.min.css";
import "slick-carousel/slick/slick.css";
import "slick-carousel/slick/slick-theme.css";
import "react-phone-input-2/lib/style.css";
import "react-toastify/dist/ReactToastify.css";

import Loader from "./Components/Common/Loader";
import MyRouts from "./Routers/routes";
import { store } from "./store/store";

function App() {
  return (
    <div className="App">
      <Provider store={store}>
        <MyRouts />
        <ToastContainer />
        <Loader />
      </Provider>
      
    </div>
  );
}

export default App;
