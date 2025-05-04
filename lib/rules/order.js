module.exports = {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Enforce structure inside functional React components',
    },
  },

  create(context) {
    return {
      FunctionDeclaration(node) {
        if (!node.id || !/^[A-Z]/.test(node.id.name)) return;

        const body = node.body.body;
        let lastSeen = 0;

        const getBlockType = (stmt) => {
          if (stmt.type === 'VariableDeclaration') {
            return stmt.declarations.reduce((type, decl) => {
              const name = decl.id?.name;

              const isHook =
                decl.init &&
                decl.init.type === 'CallExpression' &&
                decl.init.callee.type === 'Identifier' &&
                /^use[A-Z]/.test(decl.init.callee.name);

              const isUseCallback =
                decl.init &&
                decl.init.type === 'CallExpression' &&
                decl.init.callee.type === 'Identifier' &&
                (decl.init.callee.name === 'useCallback' ||
                  decl.init.callee.name === 'useMemo');

              const isHandlerName = /^handle|^on/.test(name);

              if (!isHook && !isUseCallback && !isHandlerName)
                return Math.max(type, 1);
              if (isHook) return Math.max(type, 2);
              if (isUseCallback) return Math.max(type, 3);
              if (isHandlerName) return Math.max(type, 4);

              return Math.max(type, 5);
            }, 0);
          }

          if (stmt.type === 'FunctionDeclaration') {
            const isHandler =
              stmt.id &&
              stmt.id.type === 'Identifier' &&
              /^handle/.test(stmt.id.name);

            if (isHandler) {
              context.report({
                node: stmt,
                message: `Use arrow function for handler '${stmt.id.name}' instead of function declaration.`,
              });
            }

            return 4;
          }

          if (stmt.type === 'ReturnStatement') return 5;

          return 0;
        };

        body.forEach((stmt) => {
          const typeOrder = getBlockType(stmt);
          if (typeOrder < lastSeen && typeOrder !== 0) {
            context.report({
              node: stmt,
              message: `Incorrect block order in component '${node.id.name}'. Expected order: variables → hooks → memoized handlers → event handlers → return.`,
            });
          }
          if (typeOrder !== 0) lastSeen = typeOrder;
        });

        const hookIndices = body
          .map((stmt, i) => (getBlockType(stmt) === 2 ? i : null))
          .filter((i) => i !== null);

        for (let i = 1; i < hookIndices.length; i++) {
          if (hookIndices[i] !== hookIndices[i - 1] + 1) {
            context.report({
              node: body[hookIndices[i]],
              message: `Hooks must be grouped together without interruption.`,
            });
            break;
          }
        }
      },
    };
  },
};
