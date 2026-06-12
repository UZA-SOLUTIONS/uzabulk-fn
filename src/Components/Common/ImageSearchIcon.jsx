/** Camera icon for “search by image” in the header search bar. */
export default function ImageSearchIcon({ size = 22 }) {
    return (
        <svg
            xmlns="http://www.w3.org/2000/svg"
            width={size}
            height={size}
            viewBox="0 0 24 24"
            fill="none"
            aria-hidden
        >
            <path
                d="M9 4.5h6l1.25 2.25H19a2 2 0 0 1 2 2v9.5a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8.75a2 2 0 0 1 2-2h2.75L9 4.5z"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinejoin="round"
            />
            <circle cx="12" cy="13" r="3.4" stroke="currentColor" strokeWidth="1.5" />
            <circle cx="17.25" cy="8.75" r="0.85" fill="currentColor" />
        </svg>
    );
}
