import React from 'react';
import './index.css';
import App from './App';
import reportWebVitals from './reportWebVitals';
import ReactDOM from "react-dom";
import {AdaptivityProvider, ConfigProvider,} from "@vkontakte/vkui";
import bridge from "@vkontakte/vk-bridge";
import "./bootstrap-utilities.min.css"

bridge.send("VKWebAppInit")

ReactDOM.render(
    <ConfigProvider>
        <AdaptivityProvider>
            <App/>
        </AdaptivityProvider>
    </ConfigProvider>,
    document.getElementById("root")
);


reportWebVitals();
