
window.onload = function() {
  // Build a system
  var url = window.location.search.match(/url=([^&]+)/);
  if (url && url.length > 1) {
    url = decodeURIComponent(url[1]);
  } else {
    url = window.location.origin;
  }
  var options = {
  "swaggerDoc": {
    "openapi": "3.0.0",
    "info": {
      "title": "Vkusno API",
      "version": "2.0.0",
      "description": "Полный API проекта \"Вкусно\" — рецепты, социалка, модерация, синхронизация"
    },
    "servers": [
      {
        "url": "/",
        "description": "Текущий сервер"
      }
    ],
    "components": {
      "securitySchemes": {
        "bearerAuth": {
          "type": "http",
          "scheme": "bearer",
          "bearerFormat": "JWT"
        }
      }
    },
    "security": [
      {
        "bearerAuth": []
      }
    ],
    "paths": {
      "/admin/stats": {
        "get": {
          "summary": "Общая статистика",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Счётчики пользователей",
              "рецептов": null,
              "комментариев": null,
              "лайков": null
            }
          }
        }
      },
      "/admin/users": {
        "get": {
          "summary": "Список всех пользователей",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Массив пользователей"
            }
          }
        }
      },
      "/admin/users/{id}/block": {
        "post": {
          "summary": "Заблокировать пользователя",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Пользователь заблокирован"
            }
          }
        }
      },
      "/admin/recipes/{id}": {
        "delete": {
          "summary": "Удалить рецепт (модерация)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Рецепт удалён"
            }
          }
        }
      },
      "/admin/comments/{id}": {
        "delete": {
          "summary": "Удалить комментарий (модерация)",
          "tags": [
            "Admin"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Комментарий удалён"
            }
          }
        }
      },
      "/auth/register": {
        "post": {
          "summary": "Регистрация",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "username",
                    "name",
                    "email",
                    "password"
                  ],
                  "properties": {
                    "username": {
                      "type": "string"
                    },
                    "name": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string"
                    },
                    "password": {
                      "type": "string"
                    },
                    "avatar_url": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Пользователь создан"
            }
          }
        }
      },
      "/auth/login": {
        "post": {
          "summary": "Вход (получение access + refresh токенов)",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email",
                    "password"
                  ],
                  "properties": {
                    "email": {
                      "type": "string"
                    },
                    "password": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Токены и данные пользователя"
            }
          }
        }
      },
      "/auth/refresh": {
        "post": {
          "summary": "Обновление access-токена по refresh-токену",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "refresh_token"
                  ],
                  "properties": {
                    "refresh_token": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Новая пара токенов"
            }
          }
        }
      },
      "/auth/logout": {
        "post": {
          "summary": "Выход (отзыв refresh-токена)",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "refresh_token": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Выход выполнен"
            }
          }
        }
      },
      "/auth/password-recovery": {
        "post": {
          "summary": "Запрос на восстановление пароля",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email"
                  ],
                  "properties": {
                    "email": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Код отправлен"
            }
          }
        }
      },
      "/auth/reset-password": {
        "post": {
          "summary": "Установка нового пароля по коду",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email",
                    "code",
                    "new_password"
                  ],
                  "properties": {
                    "email": {
                      "type": "string"
                    },
                    "code": {
                      "type": "string"
                    },
                    "new_password": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Пароль изменён"
            }
          }
        }
      },
      "/auth/verify-email": {
        "post": {
          "summary": "Подтверждение email по коду",
          "tags": [
            "Auth"
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "email",
                    "code"
                  ],
                  "properties": {
                    "email": {
                      "type": "string"
                    },
                    "code": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Email подтвержден"
            },
            "400": {
              "description": "Неверный код или email уже подтвержден"
            }
          }
        }
      },
      "/comments/{id}": {
        "delete": {
          "summary": "Удалить свой комментарий",
          "tags": [
            "Comments"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Удалён"
            }
          }
        }
      },
      "/comments/{id}/like": {
        "post": {
          "summary": "Лайкнуть/убрать лайк с комментария",
          "tags": [
            "Comments"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Статус лайка изменён"
            }
          }
        }
      },
      "/favorites": {
        "get": {
          "summary": "Мои сохраненные рецепты",
          "tags": [
            "Favorites"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Список избранных рецептов"
            }
          }
        }
      },
      "/meta/categories": {
        "get": {
          "summary": "Список категорий",
          "tags": [
            "Meta"
          ],
          "responses": {
            "200": {
              "description": "Массив категорий"
            }
          }
        },
        "post": {
          "summary": "Создать категорию (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "image_url": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Создано"
            }
          }
        }
      },
      "/meta/categories/{id}": {
        "put": {
          "summary": "Обновить категорию (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Обновлено"
            }
          }
        },
        "delete": {
          "summary": "Удалить категорию (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Удалено"
            }
          }
        }
      },
      "/meta/kitchens": {
        "get": {
          "summary": "Национальные кухни",
          "tags": [
            "Meta"
          ],
          "responses": {
            "200": {
              "description": "Массив кухонь"
            }
          }
        },
        "post": {
          "summary": "Создать кухню (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "image_url": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Создано"
            }
          }
        }
      },
      "/meta/kitchens/{id}": {
        "put": {
          "summary": "Обновить кухню (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Обновлено"
            }
          }
        },
        "delete": {
          "summary": "Удалить кухню (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Удалено"
            }
          }
        }
      },
      "/meta/cooking-types": {
        "get": {
          "summary": "Способы приготовления",
          "tags": [
            "Meta"
          ],
          "responses": {
            "200": {
              "description": "Массив типов готовки"
            }
          }
        },
        "post": {
          "summary": "Создать способ приготовления (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "image_url": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Создано"
            }
          }
        }
      },
      "/meta/cooking-types/{id}": {
        "put": {
          "summary": "Обновить способ приготовления (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Обновлено"
            }
          }
        },
        "delete": {
          "summary": "Удалить способ приготовления (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Удалено"
            }
          }
        }
      },
      "/meta/celebrations": {
        "get": {
          "summary": "Праздничные события",
          "tags": [
            "Meta"
          ],
          "responses": {
            "200": {
              "description": "Массив праздников"
            }
          }
        },
        "post": {
          "summary": "Создать праздник (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "image_url": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Создано"
            }
          }
        }
      },
      "/meta/celebrations/{id}": {
        "put": {
          "summary": "Обновить праздник (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Обновлено"
            }
          }
        },
        "delete": {
          "summary": "Удалить праздник (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Удалено"
            }
          }
        }
      },
      "/meta/units": {
        "get": {
          "summary": "Список единиц измерения",
          "tags": [
            "Meta"
          ],
          "responses": {
            "200": {
              "description": "Массив единиц измерения"
            }
          }
        },
        "post": {
          "summary": "Создать ед. измерения (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "short_name": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Создано"
            }
          }
        }
      },
      "/meta/units/{id}": {
        "put": {
          "summary": "Обновить ед. измерения (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Обновлено"
            }
          }
        },
        "delete": {
          "summary": "Удалить ед. измерения (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Удалено"
            }
          }
        }
      },
      "/meta/ingredients": {
        "get": {
          "summary": "Поиск ингредиентов",
          "tags": [
            "Meta"
          ],
          "parameters": [
            {
              "in": "query",
              "name": "search",
              "schema": {
                "type": "string"
              },
              "description": "Поиск по названию"
            }
          ],
          "responses": {
            "200": {
              "description": "Массив ингредиентов"
            }
          }
        },
        "post": {
          "summary": "Создать новый ингредиент (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "unit_of_measurement": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Созданный ингредиент"
            }
          }
        }
      },
      "/meta/ingredients/{id}": {
        "put": {
          "summary": "Обновить ингредиент (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object"
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Обновленный ингредиент"
            }
          }
        },
        "delete": {
          "summary": "Удалить ингредиент (Admin)",
          "tags": [
            "Meta"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Сообщение об удалении"
            }
          }
        }
      },
      "/recipes": {
        "get": {
          "summary": "Глобальная лента рецептов (с фильтрами и поиском)",
          "tags": [
            "Recipes"
          ],
          "parameters": [
            {
              "in": "query",
              "name": "search",
              "schema": {
                "type": "string"
              },
              "description": "Поиск по названию/описанию"
            },
            {
              "in": "query",
              "name": "kitchen_id",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "celebration_id",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "cooking_id",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "category_id",
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "query",
              "name": "difficulty",
              "schema": {
                "type": "string"
              }
            },
            {
              "in": "query",
              "name": "is_private",
              "schema": {
                "type": "boolean"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Список рецептов"
            }
          }
        },
        "post": {
          "summary": "Создать рецепт",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "title",
                    "description",
                    "portion",
                    "cooking_time"
                  ],
                  "properties": {
                    "title": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    },
                    "difficulty": {
                      "type": "string"
                    },
                    "portion": {
                      "type": "integer"
                    },
                    "cooking_time": {
                      "type": "integer"
                    },
                    "is_private": {
                      "type": "boolean"
                    },
                    "proteins": {
                      "type": "number",
                      "description": "Белки"
                    },
                    "fats": {
                      "type": "number",
                      "description": "Жиры"
                    },
                    "carbohydrates": {
                      "type": "number",
                      "description": "Углеводы"
                    },
                    "calorific": {
                      "type": "integer",
                      "description": "Калории"
                    },
                    "categories": {
                      "type": "array",
                      "items": {
                        "type": "integer"
                      }
                    },
                    "ingredients": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "id": {
                            "type": "integer"
                          },
                          "quantity": {
                            "type": "integer"
                          },
                          "note": {
                            "type": "string"
                          }
                        }
                      }
                    },
                    "steps": {
                      "type": "array",
                      "items": {
                        "type": "object",
                        "properties": {
                          "description": {
                            "type": "string"
                          },
                          "image_url": {
                            "type": "string"
                          }
                        }
                      }
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Рецепт создан"
            }
          }
        }
      },
      "/recipes/feed": {
        "get": {
          "summary": "Лента по подпискам",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Рецепты от подписок"
            }
          }
        }
      },
      "/recipes/recommendations": {
        "get": {
          "summary": "Рекомендованные рецепты (умная лента)",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "page",
              "schema": {
                "type": "integer"
              },
              "description": "Номер страницы"
            },
            {
              "in": "query",
              "name": "limit",
              "schema": {
                "type": "integer"
              },
              "description": "Элементов на странице"
            }
          ],
          "responses": {
            "200": {
              "description": "Персонализированный список рекомендаций"
            }
          }
        }
      },
      "/recipes/random": {
        "get": {
          "summary": "Случайный рецепт",
          "tags": [
            "Recipes"
          ],
          "responses": {
            "200": {
              "description": "Случайный рецепт"
            }
          }
        }
      },
      "/recipes/{id}": {
        "get": {
          "summary": "Полная карточка рецепта",
          "tags": [
            "Recipes"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Рецепт с ингредиентами",
              "шагами и фото": null
            }
          }
        },
        "put": {
          "summary": "Редактировать рецепт (только автор)",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Рецепт обновлён"
            }
          }
        },
        "delete": {
          "summary": "Удалить рецепт (каскадно)",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Рецепт удалён"
            }
          }
        }
      },
      "/recipes/{id}/personal-note": {
        "patch": {
          "summary": "Создать или обновить личную заметку к рецепту",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "note"
                  ],
                  "properties": {
                    "note": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Заметка сохранена"
            }
          }
        }
      },
      "/recipes/{id}/export": {
        "get": {
          "summary": "Экспорт списка продуктов (text/plain)",
          "tags": [
            "Recipes"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Текстовый список продуктов"
            }
          }
        }
      },
      "/recipes/{id}/cooked": {
        "post": {
          "summary": "Отметить \"Приготовлено\"",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "201": {
              "description": "Отмечено"
            }
          }
        }
      },
      "/recipes/{id}/steps/{step_id}": {
        "patch": {
          "summary": "Редактировать шаг рецепта",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "path",
              "name": "step_id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Шаг обновлён"
            }
          }
        }
      },
      "/recipes/{id}/ingredients/{ing_id}": {
        "delete": {
          "summary": "Удалить ингредиент из рецепта",
          "tags": [
            "Recipes"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            },
            {
              "in": "path",
              "name": "ing_id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Ингредиент удалён"
            }
          }
        }
      },
      "/recipes/{id}/like": {
        "post": {
          "summary": "Поставить лайк",
          "tags": [
            "Social"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "201": {
              "description": "Лайк добавлен"
            }
          }
        },
        "delete": {
          "summary": "Убрать лайк",
          "tags": [
            "Social"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Лайк убран"
            }
          }
        }
      },
      "/recipes/{id}/favorite": {
        "post": {
          "summary": "Добавить в избранное",
          "tags": [
            "Social"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "is_downloaded": {
                      "type": "boolean"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Добавлено"
            }
          }
        },
        "delete": {
          "summary": "Удалить из избранного",
          "tags": [
            "Social"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Удалено"
            }
          }
        }
      },
      "/recipes/{id}/comments": {
        "get": {
          "summary": "Комментарии к рецепту",
          "tags": [
            "Social"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Список комментариев"
            }
          }
        },
        "post": {
          "summary": "Оставить отзыв с рейтингом",
          "tags": [
            "Social"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "content",
                    "rating"
                  ],
                  "properties": {
                    "content": {
                      "type": "string"
                    },
                    "rating": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 5
                    },
                    "parent_comment_id": {
                      "type": "integer"
                    },
                    "taste_sweet": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 5
                    },
                    "taste_sour": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 5
                    },
                    "taste_salty": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 5
                    },
                    "taste_spicy": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 5
                    },
                    "taste_umami": {
                      "type": "integer",
                      "minimum": 1,
                      "maximum": 5
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Комментарий добавлен"
            }
          }
        }
      },
      "/reports": {
        "post": {
          "summary": "Отправить жалобу на рецепт, профиль или пользователя",
          "tags": [
            "Reports"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "type",
                    "reason"
                  ],
                  "properties": {
                    "type": {
                      "type": "string",
                      "enum": [
                        "recipe",
                        "user",
                        "profile"
                      ]
                    },
                    "reported_user_id": {
                      "type": "integer",
                      "description": "ID пользователя для типов user/profile"
                    },
                    "recipe_id": {
                      "type": "integer",
                      "description": "ID рецепта для типа recipe"
                    },
                    "reason": {
                      "type": "string"
                    },
                    "description": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Жалоба отправлена"
            }
          }
        },
        "get": {
          "summary": "Получить список всех жалоб (Admin/Moderator)",
          "tags": [
            "Reports"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Список жалоб"
            }
          }
        }
      },
      "/reports/{id}": {
        "patch": {
          "summary": "Обновить статус жалобы (Admin/Moderator)",
          "tags": [
            "Reports"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "status"
                  ],
                  "properties": {
                    "status": {
                      "type": "string",
                      "enum": [
                        "pending",
                        "reviewed",
                        "resolved",
                        "dismissed"
                      ]
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Статус обновлён"
            }
          }
        }
      },
      "/sync/delta": {
        "get": {
          "summary": "Получить изменения с момента последней синхронизации",
          "tags": [
            "Sync"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "since",
              "required": true,
              "schema": {
                "type": "string",
                "format": "date-time"
              },
              "description": "ISO 8601 дата"
            }
          ],
          "responses": {
            "200": {
              "description": "Изменённые рецепты"
            }
          }
        }
      },
      "/sync/push": {
        "post": {
          "summary": "Отправить локально созданные рецепты на сервер",
          "tags": [
            "Sync"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "recipes": {
                      "type": "array",
                      "items": {
                        "type": "object"
                      }
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Синхронизировано"
            }
          }
        }
      },
      "/tools/parse": {
        "post": {
          "summary": "Парсинг рецепта по URL",
          "tags": [
            "Tools"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "url"
                  ],
                  "properties": {
                    "url": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Распарсенный объект рецепта"
            }
          }
        }
      },
      "/ai/generate": {
        "post": {
          "summary": "Генерация рецепта по списку продуктов (ИИ)",
          "tags": [
            "Tools"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "required": [
                    "products"
                  ],
                  "properties": {
                    "products": {
                      "type": "array",
                      "items": {
                        "type": "string"
                      }
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Сгенерированный рецепт"
            }
          }
        }
      },
      "/upload": {
        "post": {
          "summary": "Загрузить изображение",
          "tags": [
            "Uploads"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "required": true,
            "content": {
              "multipart/form-data": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "image": {
                      "type": "string",
                      "format": "binary",
                      "description": "Изображение для загрузки (до 5 МБ)"
                    },
                    "folder": {
                      "type": "string",
                      "description": "Папка в корзине (например, avatars, recipes, steps)"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "201": {
              "description": "Файл успешно загружен"
            },
            "400": {
              "description": "Файл не передан или неверный формат"
            }
          }
        },
        "delete": {
          "summary": "Удалить изображение из хранилища",
          "tags": [
            "Uploads"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "query",
              "name": "fileName",
              "schema": {
                "type": "string"
              },
              "required": true,
              "description": "Имя файла в MinIO (например, recipes/uuid.jpg)"
            }
          ],
          "responses": {
            "200": {
              "description": "Файл удалён"
            }
          }
        }
      },
      "/users/me": {
        "get": {
          "summary": "Мой профиль",
          "tags": [
            "Users"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Данные профиля"
            }
          }
        },
        "patch": {
          "summary": "Обновить профиль (name, bio, avatar_url, email)",
          "tags": [
            "Users"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "requestBody": {
            "content": {
              "application/json": {
                "schema": {
                  "type": "object",
                  "properties": {
                    "name": {
                      "type": "string"
                    },
                    "bio": {
                      "type": "string"
                    },
                    "avatar_url": {
                      "type": "string"
                    },
                    "email": {
                      "type": "string"
                    }
                  }
                }
              }
            }
          },
          "responses": {
            "200": {
              "description": "Обновлённый профиль"
            }
          }
        },
        "delete": {
          "summary": "Удалить свой аккаунт",
          "tags": [
            "Users"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "responses": {
            "200": {
              "description": "Аккаунт удалён"
            }
          }
        }
      },
      "/users/search": {
        "get": {
          "summary": "Поиск пользователей",
          "tags": [
            "Users"
          ],
          "parameters": [
            {
              "in": "query",
              "name": "q",
              "required": true,
              "schema": {
                "type": "string"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Список найденных пользователей"
            }
          }
        }
      },
      "/users/{id}": {
        "get": {
          "summary": "Публичный профиль (с рецептами и статистикой)",
          "tags": [
            "Users"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Профиль пользователя"
            }
          }
        }
      },
      "/users/{id}/follow": {
        "post": {
          "summary": "Подписаться на пользователя",
          "tags": [
            "Users"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "201": {
              "description": "Подписка оформлена"
            }
          }
        },
        "delete": {
          "summary": "Отписаться",
          "tags": [
            "Users"
          ],
          "security": [
            {
              "bearerAuth": []
            }
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Отписка выполнена"
            }
          }
        }
      },
      "/users/{id}/followers": {
        "get": {
          "summary": "Подписчики пользователя",
          "tags": [
            "Users"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Список подписчиков"
            }
          }
        }
      },
      "/users/{id}/following": {
        "get": {
          "summary": "На кого подписан пользователь",
          "tags": [
            "Users"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Список подписок"
            }
          }
        }
      },
      "/users/{id}/recipes": {
        "get": {
          "summary": "Рецепты конкретного пользователя",
          "tags": [
            "Users"
          ],
          "parameters": [
            {
              "in": "path",
              "name": "id",
              "required": true,
              "schema": {
                "type": "integer"
              }
            }
          ],
          "responses": {
            "200": {
              "description": "Список рецептов пользователя"
            }
          }
        }
      }
    },
    "tags": [
      {
        "name": "Admin",
        "description": "Администрирование и модерация"
      },
      {
        "name": "Auth",
        "description": "Авторизация и доступ"
      },
      {
        "name": "Comments",
        "description": "Комментарии"
      },
      {
        "name": "Favorites",
        "description": "Избранное"
      },
      {
        "name": "Meta",
        "description": "Справочники для фильтров и выпадающих списков"
      },
      {
        "name": "Recipes",
        "description": "Рецепты"
      },
      {
        "name": "Reports",
        "description": "Система жалоб (репортов)"
      },
      {
        "name": "Sync",
        "description": "Синхронизация (Offline-first)"
      },
      {
        "name": "Tools",
        "description": "Инструменты и ИИ"
      },
      {
        "name": "Uploads",
        "description": "Загрузка файлов (MinIO)"
      },
      {
        "name": "Users",
        "description": "Профили пользователей"
      }
    ]
  },
  "customOptions": {
    "persistAuthorization": true
  }
};
  url = options.swaggerUrl || url
  var urls = options.swaggerUrls
  var customOptions = options.customOptions
  var spec1 = options.swaggerDoc
  var swaggerOptions = {
    spec: spec1,
    url: url,
    urls: urls,
    dom_id: '#swagger-ui',
    deepLinking: true,
    presets: [
      SwaggerUIBundle.presets.apis,
      SwaggerUIStandalonePreset
    ],
    plugins: [
      SwaggerUIBundle.plugins.DownloadUrl
    ],
    layout: "StandaloneLayout"
  }
  for (var attrname in customOptions) {
    swaggerOptions[attrname] = customOptions[attrname];
  }
  var ui = SwaggerUIBundle(swaggerOptions)

  if (customOptions.oauth) {
    ui.initOAuth(customOptions.oauth)
  }

  if (customOptions.preauthorizeApiKey) {
    const key = customOptions.preauthorizeApiKey.authDefinitionKey;
    const value = customOptions.preauthorizeApiKey.apiKeyValue;
    if (!!key && !!value) {
      const pid = setInterval(() => {
        const authorized = ui.preauthorizeApiKey(key, value);
        if(!!authorized) clearInterval(pid);
      }, 500)

    }
  }

  if (customOptions.authAction) {
    ui.authActions.authorize(customOptions.authAction)
  }

  window.ui = ui
}

