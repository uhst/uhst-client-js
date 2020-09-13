import resolve from '@rollup/plugin-node-resolve';
import commonjs from '@rollup/plugin-commonjs';
import builtins from 'rollup-plugin-node-builtins';

export default {
    output: {
        format: 'umd',
        name: 'uhst'
    },
    external: [
        // put some third party libraries here
    ],
    onwarn: (warning) => {
        const skip_codes = [
            'THIS_IS_UNDEFINED',
            'MISSING_GLOBAL_NAME'
        ];
        if (skip_codes.indexOf(warning.code) != -1) return;
        console.error(warning);
    },
    plugins: [
        builtins(),
        resolve({preferBuiltins: true}),
        commonjs()
    ]
};