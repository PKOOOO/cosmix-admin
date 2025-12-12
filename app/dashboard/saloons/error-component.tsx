"use client";

export const SaloonsError = () => {
  return (
    <div className="flex-col">
      <div className="flex-1 space-y-4 p-4 sm:p-8 pt-6">
        <div className="text-center">
          <h1 className="text-2xl font-semibold mb-4">Error loading saloons</h1>
          <p className="text-muted-foreground mb-4">
            There was an error loading your saloons. Please try refreshing the page.
          </p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    </div>
  );
};

