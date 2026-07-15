import React from 'react';
import Header from '../Components/Header/Header';
import Footer from '../Components/Footer/Footer';
import BrowsingBehaviorTracker from '../Components/Common/BrowsingBehaviorTracker';
import FloatingBuyerAssistant from '../Components/Common/FloatingBuyerAssistant';
import MobileBottomNav from '../Components/Navigation/MobileBottomNav';
import GoogleOneTap from '../Components/Auth/GoogleOneTap';
import { Outlet, useLocation } from 'react-router-dom';
import ROUTES from '../helpers/routesHelper';

const BaseTheme = ({ header = true, footer = true }) => {

    const location = useLocation();
    const hideHeaderFooterRoutes = [
        ROUTES.FORGOT,
    ];

    const hideHeaderFooter = hideHeaderFooterRoutes.includes(location.pathname);

    return (
        <div className={`app-layout-shell${!hideHeaderFooter ? " app-layout-shell--mobile-tabbar" : ""}`}>
            <BrowsingBehaviorTracker />
            <GoogleOneTap />
            {!hideHeaderFooter && <Header />}
            <main className="app-layout-shell__main">
                <Outlet />
            </main>
            {!hideHeaderFooter && <Footer />}
            {!hideHeaderFooter && <MobileBottomNav />}
            <FloatingBuyerAssistant />
        </div>
    );
};

export default BaseTheme;
