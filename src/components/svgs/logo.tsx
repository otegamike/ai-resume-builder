
interface LogoProps {
    size?: number;
    color?: string;
    rem?: boolean;
}

export default function Logo({ size = 50, color = "#000",rem = true }: LogoProps) {
 
    const remSize = size / 16;
    const width = rem? `${remSize}rem`: `${size}px`;
    const height = rem? `${remSize * (89/110)}rem`: `${size * (89/110)}px`;

    return (
        <svg
            width={width}
            height={height}
            viewBox="0 0 110 89"
            fill='none'
            xmlns="http://www.w3.org/2000/svg"
        >
            <path fillRule="evenodd" clipRule="evenodd" d="M61.083 15.114a7.62 7.62 0 0 0 0-7.621l-1.194-2.07a10.847 10.847 0 0 0-18.788 0L1.287 74.384a9.607 9.607 0 0 0 8.281 14.411L60.891 89a5.203 5.203 0 0 0 4.548-7.767L59.66 71.032a7.76 7.76 0 0 0-6.676-3.935l-21.791-.211z" fill={color}/>
            <path fillRule="evenodd" clipRule="evenodd" d="M64.372 25.209a3.172 3.172 0 0 0-5.541.059l-8.316 15.3a5.36 5.36 0 0 0-.032 5.057l21.96 41.667a2.19 2.19 0 0 0 1.886 1.168c2.184.05 4.793-4.073 5.195-4.758 5.987-10.183 20.678-37.029 29.084-51.325a5.006 5.006 0 0 0-4.315-7.542h-10.96c-3.975 0-6.131 5.873-6.131 5.873l-10.69 18.916s-7.803-16.83-12.14-24.415" fill={color}/>
        </svg>
  )
};