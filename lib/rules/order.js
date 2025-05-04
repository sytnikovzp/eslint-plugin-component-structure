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
            const isHook = stmt.declarations.some((d) => {
              return (
                d.init &&
                d.init.type === 'CallExpression' &&
                d.init.callee &&
                d.init.callee.type === 'Identifier' &&
                /^use[A-Z]/.test(d.init.callee.name)
              );
            });

            const isHandler = stmt.declarations.some((d) => {
              return (
                d.id &&
                d.id.type === 'Identifier' &&
                (d.id.name.startsWith('handle') || d.id.name.startsWith('on'))
              );
            });

            const isLogic = stmt.declarations.some((d) => {
              return (
                d.id && d.id.type === 'Identifier' && d.id.name === 'isFetching'
              );
            });

            if (isLogic) return 1;

            if (isHook) return 2;
            if (isHandler) return 3;

            return 1;
          }

          if (stmt.type === 'FunctionDeclaration') {
            const isHandler =
              stmt.id &&
              stmt.id.type === 'Identifier' &&
              stmt.id.name.startsWith('handle');

            if (isHandler) {
              context.report({
                node: stmt,
                message: `Use arrow function for handler '${stmt.id.name}' instead of function declaration.`,
              });
            }
            return 3;
          }

          if (stmt.type === 'ReturnStatement') return 4;

          return 0;
        };

        body.forEach((stmt) => {
          const typeOrder = getBlockType(stmt);
          if (typeOrder < lastSeen && typeOrder !== 0) {
            context.report({
              node: stmt,
              message: `Incorrect block order in component '${node.id.name}'. Expected order: constants → hooks → handlers → return.`,
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
