declare module 'badwords-ko' {
    export default class Filter {
        constructor(options?: any);
        isProfane(string: string): boolean;
        clean(string: string): string;
        addWords(...words: string[]): void;
        removeWords(...words: string[]): void;
    }
}
