import React from "react";
import { Link } from "react-router-dom";
import { useTranslation } from "react-i18next";

const Carousel: React.FC = () => {
  const { t } = useTranslation();

  return (
    <div className="relative h-[300px] md:h-[500px]">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center"
        style={{ backgroundImage: 'url("/path/to/your/background.jpg")' }}
      ></div>

      {/* Overlay */}
      <div className="absolute inset-0 bg-black opacity-50"></div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
        <h1 className="text-4xl md:text-6xl font-bold mb-4 text-white drop-shadow-lg">
          {t("carousel.title")}
        </h1>
        <p className="text-lg md:text-xl mb-8 text-white/90 max-w-2xl drop-shadow-md">
          {t("carousel.description")}
        </p>
        <Link
          to="/products"
          className="group inline-flex items-center justify-center px-8 py-4 text-lg font-semibold text-white bg-gradient-to-r from-primary to-primary/80 hover:from-primary/90 hover:to-primary/70 rounded-full transition-all duration-300 transform hover:scale-105 hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2 relative overflow-hidden"
        >
          <span className="relative z-10 flex items-center">
            {t("carousel.shopNow")}
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="h-5 w-5 ml-2 transform group-hover:translate-x-1 transition-transform duration-300"
              viewBox="0 0 20 20"
              fill="currentColor"
            >
              <path
                fillRule="evenodd"
                d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
          </span>
          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-1000"></div>
        </Link>
      </div>
    </div>
  );
};

export default Carousel;
