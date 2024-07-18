import React from "react";

export const LoadingSpinner: React.FC = () => {
  return (
    <div className="loader h-3 w-3 rounded-full border-2 border-gray-200 ease-linear"></div>
  );
};

export const LoadingSpinnerChat: React.FC = () => {
  return (
    <div className="loader h-6 w-6 rounded-full border-2 border-gray-200 ease-linear"></div>
  );
};
